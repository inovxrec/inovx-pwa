import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { usePermissionCheck } from '../../hooks/usePermission';
import type { PermissionKey } from '../../lib/permissions';
import './AdminFrame.css';

export interface AdminScreen {
  id: string;
  path: string;
  label: string;
  /** The one-line description under the title (§9.15). */
  description: string;
  permission: PermissionKey;
}

/**
 * §9.15's eight screens. Each is individually permission-gated and simply does
 * not appear in navigation without its key — the tab strip below is built from
 * whatever survives that filter.
 */
export const ADMIN_SCREENS: AdminScreen[] = [
  {
    id: 'members', path: '/admin/members', label: 'Members',
    description: 'Everyone with an account, and how new ones are issued.',
    permission: 'admin.members',
  },
  {
    id: 'permissions', path: '/admin/permissions', label: 'Permissions',
    description: 'What each person may do, on top of what their role already allows.',
    permission: 'admin.permissions',
  },
  {
    id: 'occasions', path: '/admin/occasions', label: 'Occasions',
    description: 'Birthdays and dates that generate work on their own.',
    permission: 'admin.occasions',
  },
  {
    id: 'recurring', path: '/admin/recurring', label: 'Recurring',
    description: 'Rules that raise the same task on a schedule.',
    permission: 'admin.recurring',
  },
  {
    id: 'approvals', path: '/admin/approvals', label: 'Approvals',
    description: 'Everything waiting on a review, and bulk decisions.',
    permission: 'admin.approvals',
  },
  {
    id: 'integrations', path: '/admin/integrations', label: 'Integrations',
    description: 'What INOVX syncs with, and whether it is working.',
    permission: 'admin.integrations',
  },
  {
    id: 'archive', path: '/admin/archive', label: 'Archive',
    description: 'Past tenures, exports, and handing the club over.',
    permission: 'admin.archive',
  },
  {
    id: 'audit', path: '/admin/audit', label: 'Audit',
    description: 'Who changed what, and when.',
    permission: 'admin.audit',
  },
];

export interface AdminPageProps {
  screen: AdminScreen;
  /** Right-aligned primary and secondary actions for this screen. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * §9.15's shared frame: a display-2 title, a one-line body-sm description, and
 * content on paper cards.
 */
export function AdminPage({ screen, actions, children }: AdminPageProps) {
  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="display-2 admin-page__title title-reveal">{screen.label}</h2>
          <p className="body-sm admin-page__desc">{screen.description}</p>
        </div>
        {actions && <div className="admin-page__actions">{actions}</div>}
      </header>

      {children}
    </div>
  );
}

/**
 * The admin section's own nav. Every entry is gated by its own key, so a person
 * who may only see one screen sees a strip with one tab on it rather than seven
 * dead ends.
 */
export function AdminShell() {
  const can = usePermissionCheck();
  const visible = ADMIN_SCREENS.filter((screen) => can(screen.permission));

  return (
    <div className="admin">
      <nav className="admin__tabs no-scrollbar" aria-label="Admin">
        {visible.map((screen) => (
          <NavLink
            key={screen.id}
            to={screen.path}
            className={({ isActive }) => cn('admin__tab', isActive && 'admin__tab--on')}
          >
            {screen.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
