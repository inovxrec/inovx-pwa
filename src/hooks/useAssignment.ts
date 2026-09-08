import { useMemo } from 'react';
import { useAuth } from '../store/authStore';
import { useCommittees, type Committee } from '../store/committeeStore';
import { assignableDomains, useGrants } from '../store/grantStore';
import { useBoards, useMe } from '../store/ClubProvider';
import type { Domain, Person } from '../lib/tasks';

export interface Assignment {
  /** The signed-in person, as the task data knows them. */
  me?: Person;
  /** Admins and super admins raise work; members do not. */
  canCreate: boolean;
  /** Domains this person may raise work in — possibly none. */
  domains: Domain[];
  /** Committees this person may raise work in. */
  committees: Committee[];
  /**
   * True when the person may only file work against themselves. The new-task
   * form says so rather than showing an empty domain list.
   */
  selfOnly: boolean;
}

/** Stable identity for "no overrides", so the memo below actually holds. */
const NO_EDITS = Object.freeze({});

/**
 * Who the signed-in person may raise work for.
 *
 * The rule the club asked for: a super admin decides whether an admin can
 * assign into domains at all, and which ones. That decision is the scoped
 * `task.assign` grant §9.17's screen already edits, so this reads it rather
 * than inventing a second mechanism beside it.
 */
export function useAssignment(): Assignment {
  const { session } = useAuth();
  const { forPerson } = useGrants();
  const { committees } = useCommittees();

  const me = useMe();
  const boards = useBoards();
  const role = session?.role ?? 'member';
  const edits = me ? forPerson(me.id) : NO_EDITS;
  const everyDomain = boards.map((board) => board.domain);

  return useMemo(() => {
    const canCreate = role === 'admin' || role === 'super-admin';
    const domains = me ? assignableDomains(role, me.domain, edits, everyDomain) : [];

    /*
      A super admin runs every committee. Anyone else runs the ones they are
      actually on — being allowed to assign into Design does not make someone a
      member of the Techfest committee.
    */
    const mine =
      role === 'super-admin'
        ? committees
        : committees.filter((c) => c.members.some((p) => p.id === me?.id));

    return {
      me,
      canCreate,
      domains,
      committees: mine,
      selfOnly: canCreate && domains.length === 0 && mine.length === 0,
    };
  }, [role, me, edits, committees, everyDomain]);
}
