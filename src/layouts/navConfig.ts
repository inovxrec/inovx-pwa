export type Role = 'super_admin' | 'admin' | 'faculty' | 'member';

export interface NavItem {
  key: string;
  label: string;
  path: string;
}

/**
 * Full nav-rail item set (desktop, left sidebar). Filtered per role below.
 * Bottom-bar (mobile) uses a shorter subset — see BOTTOM_BAR_ITEMS.
 */
const ALL_NAV_ITEMS: Record<string, NavItem> = {
  myday: { key: 'myday', label: 'My Day', path: '/myday' },
  deck: { key: 'deck', label: 'Command Deck', path: '/deck' },
  oversight: { key: 'oversight', label: 'Oversight Deck', path: '/oversight' },
  board: { key: 'board', label: 'Board', path: '/board' },
  calendar: { key: 'calendar', label: 'Calendar', path: '/calendar' },
  people: { key: 'people', label: 'People', path: '/people' },
  permissions: { key: 'permissions', label: 'Admin', path: '/permissions' },
};

const NAV_BY_ROLE: Record<Role, string[]> = {
  super_admin: ['myday', 'deck', 'oversight', 'board', 'calendar', 'people', 'permissions'],
  admin: ['deck', 'board', 'calendar', 'people', 'permissions'],
  faculty: ['oversight', 'calendar', 'people'],
  member: ['myday', 'board', 'calendar', 'people'],
};

export function getNavItems(role: Role): NavItem[] {
  return NAV_BY_ROLE[role].map((k) => ALL_NAV_ITEMS[k]);
}

// Bottom bar always shows 5 slots max; "More" catches whatever doesn't fit.
export function getBottomBarItems(role: Role): NavItem[] {
  const items = getNavItems(role);
  return items.slice(0, 5);
}
