import type { Role } from '../store/authStore';

/**
 * Permission keys the UI asks about.
 *
 * §12: `usePermission(key)` is the only way the UI decides whether to render a
 * control, and §14 item 13 requires gated controls to be ABSENT from the DOM
 * rather than disabled. Both are courtesies — the server decides. Never treat a
 * hidden control as security.
 */
export type PermissionKey =
  | 'board.view'
  | 'task.assign'
  | 'approvals.review'
  | 'meetings.view'
  | 'analytics.view'
  | 'leaderboard.view'
  | 'admin.members'
  | 'admin.permissions'
  | 'admin.occasions'
  | 'admin.recurring'
  | 'admin.approvals'
  | 'admin.integrations'
  | 'admin.archive'
  | 'admin.audit'
  | 'export.csv';

const MEMBER: PermissionKey[] = ['board.view', 'meetings.view'];

const ADMIN: PermissionKey[] = [
  ...MEMBER,
  'task.assign',
  'approvals.review',
  'analytics.view',
  'leaderboard.view',
  'admin.approvals',
  'admin.occasions',
  'admin.recurring',
];

const SUPER_ADMIN: PermissionKey[] = [
  ...ADMIN,
  'admin.members',
  'admin.permissions',
  'admin.integrations',
  'admin.archive',
  'admin.audit',
  'export.csv',
];

/** Faculty are read-only (§9.6) — no mutating permission appears here. */
const FACULTY: PermissionKey[] = [
  'board.view',
  'meetings.view',
  'analytics.view',
  'leaderboard.view',
  'export.csv',
];

/**
 * Role defaults. Per-person grants and revokes layer on top of these (§9.17)
 * once the Permissions screen and the backend exist; the shape below is what
 * the server will send.
 */
export const ROLE_DEFAULTS: Record<Role, PermissionKey[]> = {
  member: MEMBER,
  admin: ADMIN,
  'super-admin': SUPER_ADMIN,
  faculty: FACULTY,
};

export function resolvePermissions(
  role: Role,
  grants: PermissionKey[] = [],
  revokes: PermissionKey[] = [],
): Set<PermissionKey> {
  const resolved = new Set([...ROLE_DEFAULTS[role], ...grants]);
  for (const key of revokes) resolved.delete(key);
  return resolved;
}
