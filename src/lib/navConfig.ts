import type { ComponentType } from 'react';
import type { Role } from '../store/authStore';
import type { PermissionKey } from './permissions';
import {
  IconBell, IconBoard, IconCalendar, IconChart, IconDeck, IconEye,
  IconMeetings, IconPeople, IconSettings, IconShield, IconSun,
} from '../ui/icons';

export interface NavItem {
  id: string;
  /** Anton uppercase in the rail, `micro` under the bottom-bar icon. */
  label: string;
  path: string;
  icon: ComponentType;
  /** Absent from the nav entirely without this key (§14 item 13). */
  permission?: PermissionKey;
  /** Roles this destination exists for at all. Omit for everyone. */
  roles?: Role[];
  /**
   * Bottom-bar priority. The four lowest-numbered visible items become the
   * first four tabs; everything else goes to the More sheet (§7.18).
   */
  priority: number;
}

/**
 * Every destination in the product, in rail order.
 *
 * The bottom bar takes the first four this person can see and adds "More" as a
 * permanent fifth — §7.18 says exactly five items, never six, so the fifth slot
 * is never a real destination.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'my-day', label: 'My day', path: '/my-day', icon: IconSun, roles: ['member', 'admin', 'super-admin'], priority: 1 },
  { id: 'deck', label: 'Deck', path: '/deck', icon: IconDeck, roles: ['admin', 'super-admin'], priority: 1 },
  { id: 'oversight', label: 'Oversight', path: '/oversight', icon: IconEye, roles: ['faculty'], priority: 1 },
  { id: 'board', label: 'Boards', path: '/board', icon: IconBoard, permission: 'board.view', priority: 2 },
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: IconCalendar, priority: 3 },
  { id: 'people', label: 'People', path: '/people', icon: IconPeople, priority: 5 },
  { id: 'meetings', label: 'Meetings', path: '/meetings', icon: IconMeetings, permission: 'meetings.view', priority: 6 },
  { id: 'insights', label: 'Insights', path: '/insights', icon: IconChart, permission: 'analytics.view', priority: 7 },
  { id: 'notifications', label: 'Alerts', path: '/notifications', icon: IconBell, priority: 4 },
  { id: 'admin', label: 'Admin', path: '/admin', icon: IconShield, permission: 'admin.members', priority: 8 },
  { id: 'settings', label: 'Settings', path: '/settings', icon: IconSettings, priority: 9 },
];

/** The role's landing screen — §9.4, §9.5 and §9.6 each name their own. */
export const LANDING_BY_ROLE: Record<Role, string> = {
  member: '/my-day',
  admin: '/deck',
  'super-admin': '/deck',
  faculty: '/oversight',
};

export function visibleNavItems(
  role: Role,
  can: (key: PermissionKey) => boolean,
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });
}

/**
 * Splits the visible destinations into the four bottom-bar tabs and the
 * remainder, which the More sheet renders.
 */
export function splitForBottomBar(items: NavItem[]): { tabs: NavItem[]; more: NavItem[] } {
  const ordered = [...items].sort((a, b) => a.priority - b.priority);
  return { tabs: ordered.slice(0, 4), more: ordered.slice(4) };
}
