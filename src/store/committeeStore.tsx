import { useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Domain, Person } from '../lib/tasks';
import { useClub } from './ClubProvider';

/**
 * Committees are the club's cross-domain unit (§0): a group drawn from more
 * than one domain, with its own board. They are the reason a Design member
 * sees an Events task on their board at all.
 */
export interface Committee {
  /** The slug, which is what the URL carries. */
  id: string;
  name: string;
  members: Person[];
  /** Derived from the members — a committee spans whatever they span. */
  domains: Domain[];
  createdAt: string;
}

export function domainsOf(members: Person[]): Domain[] {
  return [...new Set(members.map((person) => person.domain))];
}

export interface CommitteeContextValue {
  committees: Committee[];
  loading: boolean;
  error: string;
  byId: (id: string) => Committee | undefined;
  create: (name: string, members: Person[]) => Promise<Committee | null>;
}

/**
 * Reads straight from the club provider rather than keeping a second copy.
 * Committees are loaded with the domains and the roster because every screen
 * that wants one wants those too.
 */
export function useCommittees(): CommitteeContextValue {
  const { committees, tenureId, loading, error, reload } = useClub();

  const byId = useCallback(
    (id: string) => committees.find((committee) => committee.id === id),
    [committees],
  );

  const create = useCallback(
    async (name: string, members: Person[]) => {
      if (!tenureId) return null;

      const slug =
        name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'committee';

      const { data, error: insertError } = await supabase
        .from('committees')
        .insert({ tenure_id: tenureId, name: name.trim(), slug })
        .select('id, slug, name')
        .single();

      if (insertError || !data) return null;

      if (members.length > 0) {
        await supabase.from('committee_members').insert(
          members.map((person) => ({
            tenure_id: tenureId,
            committee_id: data.id,
            user_id: person.id,
          })),
        );
      }

      await reload();

      return {
        id: data.slug,
        name: data.name,
        members,
        domains: domainsOf(members),
        createdAt: new Date().toISOString().slice(0, 10),
      };
    },
    [tenureId, reload],
  );

  return useMemo(
    () => ({ committees, loading, error, byId, create }),
    [committees, loading, error, byId, create],
  );
}
