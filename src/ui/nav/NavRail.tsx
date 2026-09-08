import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { NavItem } from '../../lib/navConfig';
import { Logo } from '../brand/Logo';
import { Tag } from '../primitives/Tag';
import './NavRail.css';

export interface NavRailProps {
  items: NavItem[];
  /** Unread / open counts, keyed by nav item id. */
  counts?: Record<string, number>;
}

/**
 * §7.18 desktop — a persistent left rail at --nav-rail wide.
 *
 * Below 1200px it collapses to a 68px icon-only strip; that is a CSS-only
 * change, so the same markup serves both and the labels stay in the DOM for
 * screen readers.
 */
export function NavRail({ items, counts = {} }: NavRailProps) {
  return (
    <nav className="rail" aria-label="Main">
      <div className="rail__brand">
        <Logo size="sm" />
      </div>

      <ul className="rail__list">
        {items.map((item) => {
          const Icon = item.icon;
          const count = counts[item.id];

          return (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) => cn('rail__item', isActive && 'rail__item--active')}
              >
                <span className="rail__icon" aria-hidden="true"><Icon /></span>
                <span className="rail__label">{item.label}</span>
                {count ? <Tag className="rail__count">{count}</Tag> : null}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
