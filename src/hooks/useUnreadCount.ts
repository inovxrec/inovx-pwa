import { useEffect, useState } from 'react';
import { useAuth } from '../store/authStore';
import { supabase, isConfigured } from '../lib/supabase';

/**
 * The badge on the notifications destination.
 *
 * Counted rather than fetched: the shell only needs the number, and pulling
 * every row to measure its length would be a second copy of the list the
 * notifications screen already owns.
 */
export function useUnreadCount(): number {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  const userId = session?.userId;

  useEffect(() => {
    if (!isConfigured || !userId) return;
    let cancelled = false;

    void supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ count: total }) => {
        if (!cancelled) setCount(total ?? 0);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return count;
}
