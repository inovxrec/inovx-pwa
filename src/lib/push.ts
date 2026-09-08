import { supabase } from './supabase';

/*
  Web Push, and the small amount of ceremony the browser demands for it.

  There is no third party here. The VAPID public key below identifies this app
  to whichever push service the browser happens to use — Google's for Chrome,
  Mozilla's for Firefox, Apple's for Safari — and all three accept it for free
  because Web Push is a standard rather than a product.
*/

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** Whether this browser can do push at all, before asking anyone anything. */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * True when this is an iPhone or iPad that has not been installed to the home
 * screen.
 *
 * iOS gives a Safari tab no push at all — no prompt, no error, nothing — so the
 * UI has to say "install it first" rather than offer a button that would appear
 * to do nothing. Detected by the absence of standalone display mode rather than
 * by sniffing the version, because that is the thing that actually decides it.
 */
export function needsInstallFirst(): boolean {
  if (typeof window === 'undefined') return false;

  const iOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac; the touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!iOS) return false;

  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return !installed;
}

export type PushState = 'unsupported' | 'needs-install' | 'default' | 'granted' | 'denied';

export function pushState(): PushState {
  if (!pushSupported()) return 'unsupported';
  if (needsInstallFirst()) return 'needs-install';
  return Notification.permission as PushState;
}

/**
 * The push spec wants the key as bytes; it travels as base64url.
 *
 * Typed against a plain ArrayBuffer rather than the default ArrayBufferLike:
 * `applicationServerKey` will not accept a view that might be backed by a
 * SharedArrayBuffer, and the difference is invisible until it fails to compile.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function encode(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

/**
 * Asks for permission, subscribes, and records the subscription against this
 * person so the server can reach this device.
 *
 * Called from a click and nowhere else. A browser only lets you ask once — a
 * refusal is permanent and cannot be re-asked from code — so the prompt has to
 * come at a moment when the person has already decided they want it.
 */
export async function enablePush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: 'This browser cannot do push notifications.' };
  if (needsInstallFirst()) {
    return {
      ok: false,
      reason: 'On iPhone, add INOVX to your home screen first — Safari tabs cannot receive push.',
    };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, reason: 'No VAPID key is configured. Run scripts/generate-vapid-keys.mjs.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      reason:
        permission === 'denied'
          ? 'Notifications are blocked for this site. Turn them back on in your browser settings.'
          : 'Notifications were not allowed.',
    };
  }

  const registration = await navigator.serviceWorker.ready;

  /*
    Reuse an existing subscription rather than creating a second one. Chrome
    refuses a new subscribe while one is live anyway, and a person who enables
    push on the same device twice should end up with one row, not two.
  */
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      // Required by every browser: a push must always be shown to the person.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? encode(subscription.getKey('p256dh')),
      auth: json.keys?.auth ?? encode(subscription.getKey('auth')),
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: 'endpoint' },
  );

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

/**
 * Stops push on this device only.
 *
 * The row is deleted as well as the browser subscription dropped: leaving it
 * would have the server pushing into a subscription nobody is listening to,
 * which the push service eventually rejects and which looks like a bug.
 */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

/** Whether this particular device is already subscribed. */
export async function isSubscribedHere(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) !== null;
}
