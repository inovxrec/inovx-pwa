import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import { PEOPLE } from '../lib/mockTasks';
import type { PermissionEdits } from '../lib/permissionGroups';
import type { PermissionKey } from '../lib/permissions';
import type { Domain } from '../lib/tasks';
import type { Role } from './authStore';

/**
 * Per-person permission overrides — what §9.17's screen writes and the rest of
 * the app reads.
 *
 * Kept apart from the session because it is about everyone, not about whoever
 * is signed in: the President edits Karan's grants, and Karan's own next screen
 * has to reflect them.
 *
 * TEMP: in memory. It becomes PATCH /members/:id/permissions.
 */
export interface GrantContextValue {
  /** Every override, keyed by person id. */
  grants: Record<string, PermissionEdits>;
  forPerson: (personId: string) => PermissionEdits;
  setForPerson: (personId: string, edits: PermissionEdits) => void;
  clearForPerson: (personId: string) => void;
}

const GrantContext = createContext<GrantContextValue | null>(null);

/**
 * One shared empty object for everyone with no overrides. Returning a fresh
 * `{}` would give every caller a new identity on every render, and the memos
 * downstream that key off it would never hold.
 */
const NONE: PermissionEdits = Object.freeze({});

/**
 * TEMP seed, so the scoping is visible without first driving §9.17's screen.
 *
 * Arjun is the Events lead, so he would inherit Events alone. This grant says
 * Design and Media instead — the scope replaces the default rather than adding
 * to it, which is what "the super admin decides which domains" has to mean for
 * the control to be able to take something away as well as give it.
 */
const SEED: Record<string, PermissionEdits> = {
  [PEOPLE.arjun.id]: {
    'task.assign': { decision: 'grant', domains: ['design', 'media'] },
  },
};

export function GrantProvider({ children }: { children: ReactNode }) {
  const [grants, setGrants] = useState<Record<string, PermissionEdits>>(SEED);

  const forPerson = useCallback(
    (personId: string) => grants[personId] ?? NONE,
    [grants],
  );

  const setForPerson = useCallback((personId: string, edits: PermissionEdits) => {
    setGrants((current) => ({ ...current, [personId]: edits }));
  }, []);

  const clearForPerson = useCallback((personId: string) => {
    setGrants((current) => {
      const next = { ...current };
      delete next[personId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ grants, forPerson, setForPerson, clearForPerson }),
    [grants, forPerson, setForPerson, clearForPerson],
  );

  return <GrantContext.Provider value={value}>{children}</GrantContext.Provider>;
}

export function useGrants(): GrantContextValue {
  const ctx = useContext(GrantContext);
  if (!ctx) throw new Error('useGrants must be used within a GrantProvider');
  return ctx;
}

/**
 * Which domains a person may raise work in.
 *
 * A super admin may assign anywhere. Everyone else starts with their own domain
 * and nothing else; a super admin widens or narrows that from §9.17's screen by
 * granting `task.assign` and, optionally, naming the domains it covers.
 *
 * An empty `domains` on a grant means every domain — the chip row is a
 * narrowing, so choosing none of them cannot mean choosing nothing.
 */
export function assignableDomains(
  role: Role,
  ownDomain: Domain,
  edits: PermissionEdits,
  everyDomain: Domain[],
): Domain[] {
  if (role === 'super-admin') return everyDomain;

  const edit = edits['task.assign' as PermissionKey];

  if (edit?.decision === 'revoke') return [];
  if (edit?.decision === 'grant') {
    return edit.domains.length > 0 ? edit.domains : everyDomain;
  }

  // Inherited: an admin runs their own domain, a member runs none of them.
  if (role === 'admin') return [ownDomain];
  return [];
}
