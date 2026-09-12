import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { NOT_CONFIGURED, describeError, isConfigured } from '../lib/supabase';
import {
  fetchActiveTenure, fetchCommittees, fetchDirectory, fetchDomains, fetchPermissions, fetchUsers,
} from '../lib/db/queries';
import { toMember, toPerson } from '../lib/db/map';
import type { DomainRow } from '../lib/db/rows';
import type { PermissionEdits } from '../lib/permissionGroups';
import type { PermissionKey } from '../lib/permissions';
import type { Member } from '../lib/club';
import type { Domain, Person } from '../lib/tasks';
import type { Committee } from './committeeStore';
import { useAuth } from './authStore';

/**
 * Everything about the club that is not a task: the active tenure, its domains,
 * its people, its committees and its permission overrides.
 *
 * One provider rather than four, because they are read together on nearly every
 * screen and four independent fetches would be four waterfalls. It loads once
 * per session and hands out `reload` for the screens that write.
 */
export interface ClubContextValue {
  tenureId: string | null;
  domains: DomainRow[];
  /** Every active account, as the app's Person shape. */
  people: Person[];
  /** The roster — the directory where there is one, accounts otherwise. */
  members: Member[];
  committees: Committee[];
  /** Per-person permission overrides, keyed by user id. */
  grants: Record<string, PermissionEdits>;
  loading: boolean;
  /** Non-empty when the club could not be read. Never the same as "no rows". */
  error: string;
  reload: () => Promise<void>;
}

const ClubContext = createContext<ClubContextValue | null>(null);

const NO_EDITS: PermissionEdits = Object.freeze({});

export function ClubProvider({ children }: { children: ReactNode }) {
  const [tenureId, setTenureId] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [grants, setGrants] = useState<Record<string, PermissionEdits>>({});
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState(isConfigured ? '' : NOT_CONFIGURED);

  /*
    Who is asking. Every read below is decided by row level security, so an
    anonymous reader gets nothing back — correctly. This provider mounts above
    the router, which means it first runs on the login screen with nobody signed
    in; without re-running when a session appears it would keep that empty
    answer forever, and the club would look like it had no members and no
    domains to the person who just signed in.
  */
  const { session, ready } = useAuth();
  const userId = session?.userId ?? null;

  const load = useCallback(async () => {
    if (!isConfigured) return;

    // Nothing to read as nobody. Held as loading rather than empty: "no members"
    // is a claim about the club, and not being signed in yet is not that.
    if (!userId) {
      setTenureId(null);
      setDomains([]);
      setPeople([]);
      setMembers([]);
      setCommittees([]);
      setGrants({});
      setLoading(!ready);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tenure = await fetchActiveTenure();
      if (!tenure) {
        // A real answer, not a failure: the club has not been set up yet.
        setTenureId(null);
        setDomains([]);
        setPeople([]);
        setMembers([]);
        setCommittees([]);
        setGrants({});
        return;
      }

      setTenureId(tenure.id);

      const [domainRows, userRows, committeeList, permissionRows] = await Promise.all([
        fetchDomains(tenure.id),
        fetchUsers(tenure.id),
        fetchCommittees(tenure.id),
        fetchPermissions(tenure.id),
      ]);

      setDomains(domainRows);
      setPeople(userRows.map(toPerson));
      setCommittees(committeeList);

      /*
        The directory is the club's roster and the users table is its accounts.
        They are not the same list — someone can be in the club without an
        account — so the roster is preferred and accounts are the fallback.
      */
      const committeesFor = (id: string) =>
        committeeList.filter((c) => c.members.some((p) => p.id === id)).map((c) => c.name);

      try {
        const directory = await fetchDirectory(tenure.id, domainRows);

        if (directory.length === 0) {
          setMembers(userRows.map((row) => toMember(row, committeesFor(row.id))));
        } else {
          /*
            The roster, plus anyone holding an account who is not on it.

            Faculty coordinators and the support committee are exactly that: they
            have accounts and they are deliberately absent from the club's
            roster, because they are not on the committee. Taking the directory
            alone would mean a super admin could invite somebody and then never
            see them again on the screen that invited them.

            Reconciled on email rather than id — `member_directory.linked_user_id`
            is unset for the whole roster, so the two lists share no identifier
            until somebody fills it in.
          */
          const onTheRoster = new Set(
            directory
              .map((entry) => entry.email?.trim().toLowerCase())
              .filter((email): email is string => Boolean(email)),
          );

          setMembers([
            ...directory.map((entry) => ({ ...entry, committees: committeesFor(entry.id) })),
            ...userRows
              .filter((row) => !onTheRoster.has(row.email.trim().toLowerCase()))
              .map((row) => toMember(row, committeesFor(row.id))),
          ]);
        }
      } catch {
        // The directory is optional; the account list is a fair stand-in.
        setMembers(userRows.map((row) => toMember(row, committeesFor(row.id))));
      }

      const byUser: Record<string, PermissionEdits> = {};
      for (const row of permissionRows) {
        const edits = { ...(byUser[row.user_id] ?? {}) };
        edits[row.permission_key as PermissionKey] = { decision: row.effect, domains: [] };
        byUser[row.user_id] = edits;
      }
      setGrants(byUser);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, [userId, ready]);

  // Re-runs when someone signs in or out, not only on mount.
  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    () => ({
      tenureId, domains, people, members, committees, grants, loading, error, reload: load,
    }),
    [tenureId, domains, people, members, committees, grants, loading, error, load],
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within a ClubProvider');
  return ctx;
}

/** The domains the club actually has, as slugs the design tokens know. */
export function useDomainSlugs(): Domain[] {
  const { domains } = useClub();
  return useMemo(
    () => domains.map((row) => row.slug).filter(Boolean) as Domain[],
    [domains],
  );
}

/** A domain, shaped the way the board screens want to read one. */
export interface Board {
  id: string;
  slug: string;
  name: string;
  domain: Domain;
  /** How many active accounts sit in it. */
  members: number;
}

/**
 * The club's domains as boards. Replaces the hardcoded list the screens used
 * to import — the set of domains is the club's to decide, not the frontend's.
 *
 * Core ops is one of them. It used to be filtered out on the grounds that
 * leadership is not a domain of work, but the club raises real work there —
 * planning, sponsor outreach, anything that belongs to no single domain — and
 * excluding it meant that work had nowhere to go and no board to open. Its
 * absence was also a quiet source of bugs: every Select built from this list
 * rendered empty when the value it was given happened to be `core`.
 */
export function useBoards(): Board[] {
  const { domains, people } = useClub();

  return useMemo(
    () =>
      domains
        .map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          domain: row.slug as Domain,
          members: people.filter((person) => person.domain === row.slug).length,
        })),
    [domains, people],
  );
}

/** The signed-in person as the task data knows them, or undefined while loading. */
export function useMe(): Person | undefined {
  const { people } = useClub();
  const { session } = useAuth();

  return useMemo(
    () => (session ? people.find((person) => person.id === session.userId) : undefined),
    [people, session],
  );
}

export { NO_EDITS };
