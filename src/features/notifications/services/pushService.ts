import { supabase } from '../../../lib/supabase';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Registers the root service worker (/sw.js).
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.warn('Failed to register push service worker:', err);
    return null;
  }
}

/**
 * Requests browser permission for notifications.
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribes the current device to browser Push Notifications.
 * Reads public VAPID key from VITE_VAPID_PUBLIC_KEY.
 * NOTE: The private key is NEVER exposed on the client.
 */
export async function subscribeToPush(
  userId: string
): Promise<{ subscription: PushSubscription | null; error: string | null }> {
  if (!isPushSupported()) {
    return { subscription: null, error: 'Web Push is not supported in this browser' };
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    return { subscription: null, error: 'Notification permission was not granted by user' };
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return { subscription: null, error: 'Service Worker registration failed' };
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return {
      subscription: null,
      error:
        'VITE_VAPID_PUBLIC_KEY is not configured in .env.local. Public key required for Web Push subscription.',
    };
  }

  try {
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey as unknown as BufferSource,
    });

    // Attempt to persist subscription in push_subscriptions table
    try {
      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys) {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            endpoint: subJson.endpoint,
            keys: subJson.keys,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          },
          { onConflict: 'user_id,endpoint' }
        );
      }
    } catch {
      // Table push_subscriptions migration may be pending
    }

    return { subscription, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push subscription failed';
    return { subscription: null, error: message };
  }
}

/**
 * Dispatches a client-side test notification via the active Service Worker.
 */
export async function sendTestLocalNotification(
  title: string,
  body: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications unsupported' };
  }

  if (Notification.permission !== 'granted') {
    const perm = await requestPushPermission();
    if (perm !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: '/notifications' },
    });
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to display notification';
    return { success: false, error: message };
  }
}
