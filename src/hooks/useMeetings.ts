import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClub } from '../store/ClubProvider';
import { describeError } from '../lib/supabase';
import { fetchMeetings } from '../lib/db/queries';
import { DOMAIN_LABELS, type Domain } from '../lib/tasks';
import type { Meeting } from '../lib/club';

export interface MeetingsState {
  meetings: Meeting[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

/**
 * The club's meetings, shared by §9.10 and the calendar's meetings layer.
 *
 * A meeting row points at its context by id, so the naming is resolved here
 * against the domains and committees the club provider already holds — the
 * query does not need a second round trip to spell "Design" out.
 */
export function useMeetings(): MeetingsState {
  const { tenureId, domains, committees } = useClub();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const contextName = useMemo(() => {
    const byId = new Map<string, string>();
    for (const domain of domains) byId.set(domain.id, DOMAIN_LABELS[domain.slug as Domain] ?? domain.name);
    for (const committee of committees) byId.set(committee.id, committee.name);

    return (type: string | null, id: string | null) => {
      if (!type || type === 'all') return 'Whole club';
      return (id && byId.get(id)) || 'Whole club';
    };
  }, [domains, committees]);

  const load = useCallback(async () => {
    if (!tenureId) return;

    setLoading(true);
    try {
      setMeetings(await fetchMeetings(tenureId, contextName));
      setError('');
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, [tenureId, contextName]);

  useEffect(() => {
    void load();
  }, [load]);

  return { meetings, loading, error, reload: load };
}
