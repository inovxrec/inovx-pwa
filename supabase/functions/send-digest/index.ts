// ==============================================================================
// INOVX OPS — ONE EMAIL A DAY, NOT ONE PER EVENT
// supabase/functions/send-digest/index.ts
// ==============================================================================
//
// Collects each person's unread notifications and sends them one summary.
//
// Deliberately a digest. Per-event email to 39 people is how a club teaches its
// members to filter it into a folder. One email each, once a day, is 39.
//
// Only what the person asked for: `wants_notification(..., 'email')` reads the
// same matrix the Settings screen writes.
//
// Why Gmail and not a relay
// -------------------------
// This used to post to Brevo's HTTP API, and it could never have delivered:
//
//   rajalakshmi.edu.in        v=spf1 include:_spf.google.com ~all
//   _dmarc.rajalakshmi.edu.in v=DMARC1; p=reject; pct=100; adkim=s; aspf=s
//
// The college authorises only Google to send as the domain and publishes DMARC
// at p=reject with strict alignment. Brevo would accept every message and every
// recipient — all of them on Google Workspace — would refuse it. A relay is not
// a thing we can choose here; the DNS already chose.
//
// So the digest goes out the same way a password reset does: authenticated SMTP
// as the club's own mailbox, which satisfies SPF and DKIM without a DNS change.
// The difference is only that Supabase Auth's mailer is configured in
// config.toml and sends auth email, while this is our own code and has to open
// the connection itself.
//
// The app password is NOT the mailbox password. It is issued per application at
// https://myaccount.google.com/apppasswords and needs 2-Step Verification on
// that account.
//
// Run it on a schedule (pg_cron, or Supabase's scheduler):
//   select cron.schedule('nightly-digest', '0 18 * * *', $$ ... $$);
//
// Deploy:
//   npx supabase functions deploy send-digest
//   npx supabase secrets set GMAIL_APP_PASSWORD=<16 chars> \
//     GMAIL_USER=inovx@rajalakshmi.edu.in DIGEST_FROM_NAME="INOVX Ops"

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

// A Deno-native module, not an npm one. `send-push` records why that matters:
// pulling Node packages through the compatibility layer exceeded the edge
// runtime's CPU budget before the function could send anything.

const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? 'inovx@rajalakshmi.edu.in';
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? '';
const FROM_NAME = Deno.env.get('DIGEST_FROM_NAME') ?? 'INOVX Ops';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://inovx-ops.pages.dev';

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

  if (!GMAIL_APP_PASSWORD) {
    // Named plainly: this cannot be inferred, and a quiet failure here means
    // people silently stop being told things.
    return Response.json(
      {
        error:
          'GMAIL_APP_PASSWORD is not set. Issue one at ' +
          'https://myaccount.google.com/apppasswords for ' + GMAIL_USER +
          ', then: supabase secrets set GMAIL_APP_PASSWORD=...',
      },
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

  /*
    One connection for the whole run, opened here rather than inside the loop.

    Gmail counts connections as well as messages, and opening thirty-nine of
    them in a few seconds is what a burst of authentication failures looks like
    from Google's side — the account gets throttled and the digest starts
    failing for reasons that have nothing to do with the mail. Implicit TLS on
    465 rather than STARTTLS on 587, because there is no plaintext moment to get
    wrong.
  */
  const mailer = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });

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

    /*
      One failure does not end the run. A single bad address, or Google
      throttling one message, must not cost the other thirty-eight people their
      digest — so each send is caught and recorded, and the loop continues.
    */
    try {
      await mailer.send({
        from: `${FROM_NAME} <${GMAIL_USER}>`,
        to: `${person.name} <${person.email}>`,
        subject:
          wanted.length === 1
            ? wanted[0].title
            : `${wanted.length} things waiting in INOVX`,
        content: text,
        html,
      });

      sent += 1;
      emailed.push(...wanted.map((w) => w.id));
    } catch (caught) {
      failures.push(
        `${person.email}: ${caught instanceof Error ? caught.message.slice(0, 120) : 'send failed'}`,
      );
    }
  }

  /*
    The connection is closed before anything is marked, so a failure to flush
    the last message is still a failure — closing after the PATCH would let a
    dropped send be recorded as delivered.
  */
  await mailer.close();

  /*
    Marked only after Google accepted it. A digest that marked first would go
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
