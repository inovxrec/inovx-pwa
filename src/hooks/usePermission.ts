import { useMemo } from 'react';
import { useAuth } from '../store/authStore';
import { resolvePermissions, type PermissionKey } from '../lib/permissions';

/**
 * §12 — the only way the UI decides whether to render a control.
 *
 * A false answer means the control is not rendered at all, not rendered
 * disabled (§14 item 13). This hides things as a courtesy; the server decides.
 */
export function usePermission(key: PermissionKey): boolean {
  const { session } = useAuth();
  return useMemo(() => {
    if (!session) return false;
    return resolvePermissions(session.role, session.grants, session.revokes).has(key);
  }, [session, key]);
}

/** The same check as a predicate, for filtering lists such as the nav. */
export function usePermissionCheck(): (key: PermissionKey) => boolean {
  const { session } = useAuth();
  const resolved = useMemo(
    () => (session ? resolvePermissions(session.role, session.grants, session.revokes) : new Set<PermissionKey>()),
    [session],
  );
  return (key: PermissionKey) => resolved.has(key);
}
