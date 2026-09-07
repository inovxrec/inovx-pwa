/**
 * InovX Ops - Canonical Permission Definitions & Role Templates
 * Stream B: Permissions, Visibility & Audit
 */

export type AppRole = 'super_admin' | 'admin' | 'faculty' | 'member';

export type TriState = 'revoke' | 'inherit' | 'grant';

export const PERMISSION_KEYS = [
  // Task Operations
  'task.view.all',
  'task.view.domain',
  'task.create',
  'task.edit.all',
  'task.approve',
  'task.delete',
  
  // Board & Visibility Management
  'board.view.all',
  'board.view.domain',
  'board.view.committee',
  'board.visibility.manage',

  // Operations, Automation & Meetings
  'recurring.manage',
  'announcement.create',
  'meetings.manage',

  // Administrative & Governance
  'permissions.manage',
  'oversight.view',
  'analytics.view',
  'member.manage',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

export interface PermissionMetadata {
  key: PermissionKey;
  label: string;
  description: string;
  category: 'Tasks & Workflow' | 'Boards & Visibility' | 'Operations & Automations' | 'Governance & Analytics';
}

export const PERMISSION_CATALOGUE: PermissionMetadata[] = [
  // Tasks
  {
    key: 'task.view.all',
    label: 'View all tasks',
    description: 'Bypass domain isolation to view all tasks across all boards.',
    category: 'Tasks & Workflow',
  },
  {
    key: 'task.view.domain',
    label: 'View domain tasks',
    description: 'View tasks assigned to or belonging to own assigned domain.',
    category: 'Tasks & Workflow',
  },
  {
    key: 'task.create',
    label: 'Create tasks',
    description: 'Create new tasks within assigned domains and committees.',
    category: 'Tasks & Workflow',
  },
  {
    key: 'task.edit.all',
    label: 'Edit all tasks',
    description: 'Edit descriptions, priorities, due dates, and assignees of any task.',
    category: 'Tasks & Workflow',
  },
  {
    key: 'task.approve',
    label: 'Approve completions',
    description: 'Review and approve tasks submitted for review (FR-TASK-9).',
    category: 'Tasks & Workflow',
  },
  {
    key: 'task.delete',
    label: 'Delete tasks',
    description: 'Permanently remove tasks or cancel initiatives.',
    category: 'Tasks & Workflow',
  },

  // Boards
  {
    key: 'board.view.all',
    label: 'View all boards',
    description: 'Access and view all domain and committee Kanban boards.',
    category: 'Boards & Visibility',
  },
  {
    key: 'board.view.domain',
    label: 'View domain board',
    description: 'Access the Kanban board for own assigned domain.',
    category: 'Boards & Visibility',
  },
  {
    key: 'board.view.committee',
    label: 'View committee board',
    description: 'Access boards for enrolled cross-domain committees.',
    category: 'Boards & Visibility',
  },
  {
    key: 'board.visibility.manage',
    label: 'Manage board visibility',
    description: 'Toggle boards between Private, Club-Visible, and Shared-With.',
    category: 'Boards & Visibility',
  },

  // Operations
  {
    key: 'recurring.manage',
    label: 'Manage recurring rules',
    description: 'Create and edit automated recurrence rules and birthday triggers.',
    category: 'Operations & Automations',
  },
  {
    key: 'announcement.create',
    label: 'Publish announcements',
    description: 'Broadcast in-app announcements and trigger urgent push notifications.',
    category: 'Operations & Automations',
  },
  {
    key: 'meetings.manage',
    label: 'Manage meetings & attendance',
    description: 'Schedule club meetings, mark attendance, and publish action minutes.',
    category: 'Operations & Automations',
  },

  // Governance
  {
    key: 'permissions.manage',
    label: 'Manage permissions & roles',
    description: 'Grant/revoke granular authority and inspect the security audit trail.',
    category: 'Governance & Analytics',
  },
  {
    key: 'oversight.view',
    label: 'View faculty oversight deck',
    description: 'Read-only access to club-wide performance metrics and accountability logs.',
    category: 'Governance & Analytics',
  },
  {
    key: 'analytics.view',
    label: 'View leadership analytics',
    description: 'Access Command Deck analytics, velocity trends, and domain health metrics.',
    category: 'Governance & Analytics',
  },
  {
    key: 'member.manage',
    label: 'Manage member directory',
    description: 'Sync directory rosters, assign domains, and update profile statuses.',
    category: 'Governance & Analytics',
  },
];

/**
 * 4 Base Role Default Templates (The Template in the formula)
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  super_admin: [
    'task.view.all',
    'task.view.domain',
    'task.create',
    'task.edit.all',
    'task.approve',
    'task.delete',
    'board.view.all',
    'board.view.domain',
    'board.view.committee',
    'board.visibility.manage',
    'recurring.manage',
    'announcement.create',
    'meetings.manage',
    'permissions.manage',
    'oversight.view',
    'analytics.view',
    'member.manage',
  ],
  admin: [
    'task.view.all',
    'task.view.domain',
    'task.create',
    'task.edit.all',
    'task.approve',
    'board.view.all',
    'board.view.domain',
    'board.view.committee',
    'board.visibility.manage',
    'recurring.manage',
    'announcement.create',
    'meetings.manage',
    'analytics.view',
    'member.manage',
  ],
  faculty: [
    'task.view.all',
    'board.view.all',
    'oversight.view',
  ],
  member: [
    'task.create',
    'task.view.domain',
    'board.view.domain',
    'board.view.committee',
  ],
};

export interface MemberProfile {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  domain: string;
  positionTitle?: string;
  initials?: string;
}

export interface UserPermissionRecord {
  id: string;
  userId: string;
  permissionKey: PermissionKey;
  isGranted: boolean;
  grantedBy?: string;
  createdAt?: string;
}

export interface PermissionDiff {
  granted: PermissionKey[];
  revoked: PermissionKey[];
  inherited: PermissionKey[];
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName?: string;
  entityType: 'user_permissions' | 'role' | 'board_visibility';
  entityId: string;
  action: 'GRANT' | 'REVOKE' | 'RESET_ROLE' | 'ROLE_CHANGE' | 'UPDATE_PERMISSIONS';
  diff: Record<string, unknown> | PermissionDiff;
  createdAt: string;
}
