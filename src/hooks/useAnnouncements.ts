import { useEffect, useState } from 'react';
import { useClub } from '../store/ClubProvider';
import { describeError } from '../lib/supabase';
import { fetchAnnouncements } from '../lib/db/queries';
import type { Person } from '../lib/tasks';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  by?: Person;
  at: string;
}

/** The pinned announcements §9.4 shows under the day's work. */
export function useAnnouncements(): { announcements: Announcement[]; error: string } {
  const { tenureId } = useClub();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenureId) return;
    let cancelled = false;

    fetchAnnouncements(tenureId)
      .then((rows) => !cancelled && setAnnouncements(rows))
      .catch((caught) => !cancelled && setError(describeError(caught)));

    return () => {
      cancelled = true;
    };
  }, [tenureId]);

  return { announcements, error };
}
