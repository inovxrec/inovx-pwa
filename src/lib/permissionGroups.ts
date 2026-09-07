import type { PermissionKey } from './permissions';
import type { Domain } from './tasks';

/**
 * §9.17 — every permission in plain English, grouped the way the Permissions
 * screen shows them.
 *
 * The names here are the ones a club president reads, not the keys an engineer
 * greps for. A row that cannot be explained in one line is a permission that
 * should not exist.
 */
export interface PermissionMeta {
  key: PermissionKey;
  /** The plain-English name shown on the row. */
  name: string;
  /**
   * Whether a grant can be narrowed to particular domains. §9.17 shows a domain
   * chip row beneath a granted permission only when this is true.
   */
  scopable?: boolean;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionMeta[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'tasks',
    label: 'Tasks',
    permissions: [
      { key: 'board.view', name: 'View boards' },
      { key: 'task.assign', name: 'Assign and edit tasks', scopable: true },
      { key: 'approvals.review', name: 'Approve completed work', scopable: true },
    ],
  },
  {
    id: 'committees',
    label: 'Committees',
    permissions: [
      { key: 'meetings.view', name: 'See meetings and minutes' },
      { key: 'admin.recurring', name: 'Manage recurring rules', scopable: true },
      { key: 'admin.occasions', name: 'Manage occasions', scopable: true },
    ],
  },
  {
    id: 'members',
    label: 'Members',
    permissions: [
      { key: 'admin.members', name: 'Add and edit members' },
      { key: 'admin.permissions', name: 'Change what others may do' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    permissions: [
      { key: 'analytics.view', name: 'See insights and charts' },
      { key: 'leaderboard.view', name: 'See the leaderboard' },
      { key: 'export.csv', name: 'Export data as CSV' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    permissions: [
      { key: 'admin.approvals', name: 'Use the bulk approval queue' },
      { key: 'admin.integrations', name: 'Manage integrations' },
      { key: 'admin.archive', name: 'Archive a tenure and hand over' },
      { key: 'admin.audit', name: 'Read the audit log' },
    ],
  },
];

/** Each row is inherited from the role, explicitly granted, or explicitly revoked. */
export type Decision = 'inherit' | 'grant' | 'revoke';

export interface PermissionEdit {
  decision: Decision;
  /** Only meaningful on a scopable grant. Empty means every domain. */
  domains: Domain[];
}

export type PermissionEdits = Partial<Record<PermissionKey, PermissionEdit>>;

export const ALL_PERMISSIONS: PermissionMeta[] = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions,
);

export function metaFor(key: PermissionKey): PermissionMeta | undefined {
  return ALL_PERMISSIONS.find((meta) => meta.key === key);
}
