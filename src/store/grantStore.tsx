import { useCallback, useMemo } from 'react';
import { savePermissions } from '../lib/db/queries';
import type { PermissionEdits } from '../lib/permissionGroups';
import type { PermissionKey } from '../lib/permissions';
import type { Domain } from '../lib/tasks';
import type { Role } from './authStore';
import { NO_EDITS, useClub } from './ClubProvider';

/**
 * Per-person permission overrides — what §9.17's screen writes and the rest of
 * the app reads. They live in `user_permissions`, one row per granted or
 * revoked key.
 */
export interface GrantContextValue {
  grants: Record<string, PermissionEdits>;
  forPerson: (personId: string) => PermissionEdits;
  setForPerson: (personId: string, edits: PermissionEdits) => Promise<void>;
  clearForPerson: (personId: string) => Promise<void>;
}

export function useGrants(): GrantContextValue {
  const { grants, tenureId, reload } = useClub();

  const forPerson = useCallback(
    (personId: string) => grants[personId] ?? NO_EDITS,
    [grants],
  );

  const setForPerson = useCallback(
    async (personId: string, edits: PermissionEdits) => {
      if (!tenureId) return;
      await savePermissions(
        tenureId,
        personId,
        Object.entries(edits).map(([key, edit]) => ({
          key,
          effect: edit?.decision ?? 'inherit',
        })),
      );
      await reload();
    },
    [tenureId, reload],
  );

  const clearForPerson = useCallback(
    async (personId: string) => {
      if (!tenureId) return;
      await savePermissions(tenureId, personId, []);
      await reload();
    },
    [tenureId, reload],
  );

  return useMemo(
    () => ({ grants, forPerson, setForPerson, clearForPerson }),
    [grants, forPerson, setForPerson, clearForPerson],
  );
}

/**
 * Which domains a person may raise work in.
 *
 * A super admin may assign anywhere. Everyone else starts with their own domain
 * and nothing else; a super admin widens or narrows that from §9.17's screen by
 * granting `task.assign`.
 *
 * NOTE: the schema's user_permissions table records a key and an effect but no
 * scope, so a grant currently means every domain rather than a chosen few. The
 * chip row in the UI still narrows it locally; making that stick needs a
 * `domains TEXT[]` column on user_permissions. Flagged in the README.
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

  if (role === 'admin') return [ownDomain];
  return [];
}
