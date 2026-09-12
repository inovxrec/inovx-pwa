// ==============================================================================
// INOVX OPS — INVITING SOMEONE WHO ONLY WATCHES
// supabase/functions/invite-viewer/index.ts
// ==============================================================================
//
// A super admin names a faculty coordinator or a support-committee member, and
// this issues them an account they set the password on themselves.
//
// Why an edge function and not the browser
// ----------------------------------------
// Creating an account needs the service role, which bypasses row level security
// entirely. §9.15's screen has said so since it was built — its "Add member"
// button has, until now, fired a toast reading "Issuing accounts runs on the
// server — that endpoint is not wired up yet." This is that endpoint.
//
// Why no password is generated here
// ---------------------------------
// `scripts/provision-roster.mjs` mints passwords because it issues 39 at once
// and hands them out on paper. One person is a different problem: a password
// generated here would have to travel to them through whoever pressed the
// button, which is worse than the reset link doing it directly. So the account
// is created with a throwaway secret nobody ever sees, and the only way in is
// the recovery mail Supabase Auth sends on the next line.
//
// That mail goes out over the SMTP configured in the dashboard, which is the
// same path "Forgot password" already uses. Nothing new has to be trusted with
// the club's address, and no third-party relay is asked to send as the college
// domain — which it could not do anyway, DMARC being what it is there.
//
// Deploy:
//   npx supabase functions deploy invite-viewer
//   npx supabase secrets set APP_URL=https://inovx-ops.pages.dev

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? '';

const VIEWER_KINDS = ['faculty_coordinator', 'support_committee'] as const;
type ViewerKind = (typeof VIEWER_KINDS)[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** PostgREST with the service role. */
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

/**
 * Who is asking, from their own token.
 *
 * The caller's JWT is checked against GoTrue rather than decoded here. A token
 * this function only reads the claims of is a token it has not verified, and
 * "the client said it was the president" is not an authorisation check.
 */
async function callerId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: authHeader },
  });

  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ error: 'The function is missing its Supabase environment.' }, 500);
  }

  // ---------------------------------------------------------------- who asks
  const uid = await callerId(request.headers.get('Authorization'));
  if (!uid) return json({ error: 'Sign in first.' }, 401);

  /*
    Super admin only, read from the database rather than from the token. Roles
    live in public.users and can be changed after a session is issued; a JWT
    claim would still say "super_admin" for the rest of that session's life.
  */
  const askerResponse = await db(`users?id=eq.${uid}&select=role,tenure_id`);
  const [asker] = (await askerResponse.json()) as Array<{
    role?: string;
    tenure_id?: string | null;
  }>;

  if (asker?.role !== 'super_admin') {
    return json({ error: 'Only a super admin can invite a viewer.' }, 403);
  }

  // -------------------------------------------------------------- what it is
  let payload: { name?: string; email?: string; viewerKind?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const name = (payload.name ?? '').trim();
  const email = (payload.email ?? '').trim().toLowerCase();
  const viewerKind = (payload.viewerKind ?? '').trim() as ViewerKind;

  if (!name) return json({ error: 'A name is required.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'That does not look like an email address.' }, 400);
  }
  if (!VIEWER_KINDS.includes(viewerKind)) {
    return json({ error: 'Pick faculty coordinator or support committee.' }, 400);
  }

  // Answered before creating anything, so a second press of the button reads as
  // "already invited" rather than as a GoTrue duplicate-key error.
  const existing = await db(`users?email=eq.${encodeURIComponent(email)}&select=id`);
  if (((await existing.json()) as unknown[]).length > 0) {
    return json({ error: `${email} already has an account.` }, 409);
  }

  // ------------------------------------------------------------- the account
  /*
    A secret nobody is told and nobody keeps. It exists because the account
    needs one to be created at all; the recovery mail below is the only route
    in, and `must_change_password` sends them to /first-run even after that.
  */
  const throwaway = crypto.randomUUID() + crypto.randomUUID();

  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: throwaway,
      // Confirmed on creation: they are being invited by the club's president,
      // and a confirmation mail on top of the reset mail is two links to read.
      email_confirm: true,
      user_metadata: {
        name,
        role: 'faculty',
        viewer_kind: viewerKind,
        must_change_password: true,
      },
    }),
  });

  if (!created.ok) {
    const detail = await created.text();
    return json(
      { error: `Could not create the account: ${detail.slice(0, 200)}` },
      created.status,
    );
  }

  /*
    `handle_new_user` has already written the profile — role, viewer_kind,
    tenure — inside the same transaction as the account, so there is nothing to
    update here. That is the point of doing it in the trigger: this function
    cannot half-succeed and leave a faculty account with no label.
  */

  // ---------------------------------------------------------- the way in
  const invited = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      ...(APP_URL ? { redirect_to: `${APP_URL}/first-run` } : {}),
    }),
  });

  /*
    The account exists either way, so a mail that did not send is reported
    rather than rolled back — deleting a real account because one email failed
    would be the worse of the two outcomes, and the president can re-send from
    the sign-in screen's "Forgot password" with no further access needed.
  */
  if (!invited.ok) {
    return json(
      {
        ok: true,
        emailed: false,
        warning:
          `${name} now has an account, but the reset email did not send. ` +
          'Ask them to use "Forgot password" on the sign-in screen.',
      },
      200,
    );
  }

  return json({ ok: true, emailed: true, name, email, viewerKind });
});
