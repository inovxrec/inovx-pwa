import { useCallback, useEffect, useState } from 'react';
import {
  disablePush, enablePush, isSubscribedHere, pushState, type PushState,
} from '../lib/push';

export interface Push {
  /** What this browser can do, before anyone is asked anything. */
  state: PushState;
  /** True when THIS device is subscribed — push is per-device, not per-account. */
  subscribed: boolean;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  /** Set when the last attempt failed, in words worth showing someone. */
  error: string;
}

/**
 * Push, from the screen's point of view.
 *
 * Deliberately per-device: someone signed in on a laptop and a phone has
 * subscribed one of them, and a control that claimed otherwise would be lying
 * on whichever device they are not holding.
 */
export function usePush(userId: string | undefined): Push {
  const [state, setState] = useState<PushState>(() => pushState());
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void isSubscribedHere().then((yes) => !cancelled && setSubscribed(yes));
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setError('');

    const result = await enablePush(userId);

    setState(pushState());
    setSubscribed(result.ok);
    if (!result.ok) setError(result.reason ?? 'Could not turn on notifications.');
    setBusy(false);
  }, [userId]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await disablePush();
      setSubscribed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not turn them off.');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, subscribed, busy, enable, disable, error };
}
