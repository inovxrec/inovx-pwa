// ==============================================================================
// INOVX OPS — ONE EMAIL A DAY, NOT ONE PER EVENT
// supabase/functions/send-digest/index.ts
// ==============================================================================
//
// Collects each person's unread notifications and sends them one summary.
//
// Deliberately a digest. Per-event email to 39 people is how a club teaches its
// members to filter it into a folder, and it would burn Brevo's 300/day on a
// single busy afternoon. One email each, once a day, is 39 — which fits inside
// the free tier with room to spare.
//
// Only what the person asked for: `wants_notification(..., 'email')` reads the
// same matrix the Settings screen writes, and email is off by default there, so
// this sends to nobody until someone opts in.
//
// Run it on a schedule (pg_cron, or Supabase's scheduler):
//   select cron.schedule('nightly-digest', '0 18 * * *', $$ ... $$);
//
// Deploy:
//   npx supabase functions deploy send-digest
//   npx supabase secrets set BREVO_API_KEY=xkeysib-... \
//     DIGEST_FROM_EMAIL=inovx@yourdomain.com DIGEST_FROM_NAME="INOVX Ops"

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('DIGEST_FROM_EMAIL') ?? '';
const FROM_NAME = Deno.env.get('DIGEST_FROM_NAME') ?? 'INOVX Ops';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://inovx.example';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** PostgREST with the service role — this runs on a schedule, as nobody. */
function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

interface Row {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

function render(name: string, items: Row[]): { html: string; text: string } {
  const lines = items.map((n) => `${n.title} — ${n.body}`);

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                max-width:520px;margin:0 auto;color:#1a1a1a">
      <p>Hello ${escapeHtml(name)},</p>
      <p>${items.length === 1 ? 'One thing' : `${items.length} things`} waiting in INOVX:</p>
      <ul style="padding-left:18px">
        ${items.map((n) => `
          <li style="margin-bottom:10px">
            <strong>${escapeHtml(n.title)}</strong><br>
            <span style="color:#555">${escapeHtml(n.body)}</span>
          </li>`).join('')}
      </ul>
      <p><a href="${APP_URL}/notifications"
            style="background:#E8501E;color:#fff;padding:10px 18px;
                   border-radius:999px;text-decoration:none;display:inline-block">
        Open INOVX</a></p>
      <p style="color:#777;font-size:13px">
        You are getting this because email is switched on for these in your
        notification settings. Turn it off any time in Settings.
      </p>
    </div>`;

  const text =
    `Hello ${name},\n\n${lines.join('\n')}\n\n${APP_URL}/notifications\n\n` +
    `Turn these off in Settings.\n`;

  return { html, text };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  if (!BREVO_API_KEY || !FROM_EMAIL) {
    // Named plainly: these cannot be inferred, and a quiet failure here means
    // people silently stop being told things.
    return Response.json(
      { error: 'BREVO_API_KEY and DIGEST_FROM_EMAIL are not set.' },
      { status: 500 },
    );
  }

  // Unread, not yet emailed, and recent enough to still be worth mentioning.
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const response = await db(
    `notifications?is_read=eq.false&email_sent_at=is.null&created_at=gte.${since}` +
      `&select=id,user_id,title,body,type,created_at&order=created_at.asc`,
  );
  const rows = (await response.json()) as Row[];

  if (!rows?.length) return Response.json({ sent: 0, reason: 'nothing unread' });

  const byPerson = new Map<string, Row[]>();
  for (const row of rows) {
    byPerson.set(row.user_id, [...(byPerson.get(row.user_id) ?? []), row]);
  }

  let sent = 0;
  const skipped: string[] = [];
  const failures: string[] = [];
  const emailed: string[] = [];

  for (const [userId, items] of byPerson) {
    const person = await db(`users?id=eq.${userId}&select=name,email,status`)
      .then((r) => r.json())
      .then((r) => r?.[0]);

    if (!person?.email || person.status !== 'active') continue;

    /*
      Per event, not per person: someone may want email about assignments and
      not about comments, and a digest that ignored that would be the thing
      they turned off.
    */
    const wanted: Row[] = [];
    for (const item of items) {
      const ok = await db('rpc/wants_notification', {
        method: 'POST',
        body: JSON.stringify({ target_user: userId, event_id: item.type, channel: 'email' }),
      }).then((r) => r.json());
      if (ok === true) wanted.push(item);
    }

    if (wanted.length === 0) {
      skipped.push(person.email);
      continue;
    }

    const { html, text } = render(person.name, wanted);

    const brevo = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: person.email, name: person.name }],
        subject:
          wanted.length === 1
            ? wanted[0].title
            : `${wanted.length} things waiting in INOVX`,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (brevo.ok) {
      sent += 1;
      emailed.push(...wanted.map((w) => w.id));
    } else {
      failures.push(`${person.email}: ${brevo.status} ${(await brevo.text()).slice(0, 120)}`);
    }
  }

  /*
    Marked only after Brevo accepted it. A digest that marked first would go
    quiet about everything it failed to send, which is the worst way to fail.
  */
  if (emailed.length > 0) {
    await db(`notifications?id=in.(${emailed.join(',')})`, {
      method: 'PATCH',
      body: JSON.stringify({ email_sent_at: new Date().toISOString() }),
    });
  }

  return Response.json({ sent, skipped: skipped.length, failures });
});
