// ==============================================================================
// INOVX OPS — SEND ONE NOTIFICATION TO A PERSON'S DEVICES
// supabase/functions/send-push/index.ts
// ==============================================================================
//
// Called by the `deliver_push` trigger with a notification id. Looks up who it
// is for, finds their subscribed devices, and posts an encrypted push to each.
//
// No npm imports, deliberately. Both `npm:web-push` and
// `npm:@supabase/supabase-js` are Node packages, and loading either through
// Deno's compatibility layer exceeded the edge runtime's CPU budget before the
// function could send anything:
//
//   CPU time hard limit reached: isolate: 2e5ded91-...
//   user worker failed to respond: request has been cancelled by supervisor
//
// So the encryption is on Web Crypto (./webpush.ts) and the database is reached
// over PostgREST with fetch. Both are things the runtime does natively, and the
// whole function now starts cold in milliseconds.
//
// Deploy:
//   npx supabase functions deploy send-push
//   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
//     VAPID_SUBJECT=mailto:you@example.edu.in

import { sendPush, type PushSubscription } from './webpush.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@inovx.club';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** PostgREST, with the service role — this runs behind the trigger, as nobody. */
async function db(path: string, init: RequestInit = {}): Promise<Response> {
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

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  type: string;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // Said plainly rather than failing silently: this is the one setup step
    // that cannot be inferred, and a quiet 500 here would look like a bug.
    return Response.json(
      { error: 'VAPID keys are not set. Run scripts/generate-vapid-keys.mjs, then supabase secrets set.' },
      { status: 500 },
    );
  }

  let notificationId: string;
  try {
    ({ notification_id: notificationId } = await request.json());
  } catch {
    return Response.json({ error: 'Expected { notification_id }.' }, { status: 400 });
  }

  const found = await db(
    `notifications?id=eq.${notificationId}&select=id,user_id,title,body,link,type`,
  );
  const rows = (await found.json()) as Notification[];
  const notification = rows?.[0];

  if (!notification) {
    return Response.json({ error: 'No such notification.' }, { status: 404 });
  }

  const subsResponse = await db(
    `push_subscriptions?user_id=eq.${notification.user_id}&select=endpoint,p256dh,auth`,
  );
  const subscriptions = (await subsResponse.json()) as PushSubscription[];

  if (!subscriptions || subscriptions.length === 0) {
    return Response.json({ sent: 0, reason: 'no devices' });
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.link ?? '/notifications',
    // One notification per kind per person, so three comments collapse into one
    // line on the lock screen rather than three.
    tag: `inovx-${notification.type}`,
  });

  let sent = 0;
  const dead: string[] = [];
  const failures: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const result = await sendPush(subscription, payload, {
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
          subject: VAPID_SUBJECT,
        });

        if (result.ok) {
          sent += 1;
          return;
        }

        /*
          404 and 410 mean the subscription is gone for good — reinstalled
          browser, revoked permission, expired endpoint. Anything else is
          transient and the row is left alone; dropping a live device because a
          push service had a bad minute would be worse than a missed buzz.
        */
        if (result.gone) dead.push(subscription.endpoint);
        else failures.push(`${result.status}: ${result.body ?? ''}`.slice(0, 200));
      } catch (caught) {
        failures.push(caught instanceof Error ? caught.message : String(caught));
      }
    }),
  );

  for (const endpoint of dead) {
    await db('rpc/drop_push_subscription', {
      method: 'POST',
      body: JSON.stringify({ dead_endpoint: endpoint }),
    });
  }

  await db(`notifications?id=eq.${notification.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ push_sent_at: new Date().toISOString() }),
  });

  // Failures are reported rather than swallowed: a push that silently never
  // arrives is the hardest kind of bug to notice.
  return Response.json({ sent, dropped: dead.length, failures });
});
