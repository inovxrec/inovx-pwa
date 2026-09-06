import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { NavItem } from '../../lib/navConfig';
import { IconMore } from '../icons';
import './BottomBar.css';

export interface BottomBarProps {
  /** Exactly four. The fifth slot is always More (§7.18). */
  tabs: NavItem[];
  counts?: Record<string, number>;
  onMore: () => void;
  moreOpen: boolean;
  /** True when the current route lives in the More sheet, not in a tab. */
  moreActive: boolean;
}

/**
 * §7.18 mobile — exactly five items, never six. The fifth is always "More",
 * which opens a sheet holding every remaining destination, so a mobile user is
 * never missing a capability a desktop user has (§8).
 */
export function BottomBar({ tabs, counts = {}, onMore, moreOpen, moreActive }: BottomBarProps) {
  return (
    <nav className="bottombar" aria-label="Main">
      {tabs.slice(0, 4).map((item) => {
        const Icon = item.icon;
        const count = counts[item.id];

        return (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => cn('bottombar__item', isActive && 'bottombar__item--active')}
          >
            <span className="bottombar__icon" aria-hidden="true">
              <Icon />
              {count ? <span className="bottombar__dot" /> : null}
            </span>
            <span className="bottombar__label micro">{item.label}</span>
          </NavLink>
        );
      })}

      <button
        type="button"
        className={cn('bottombar__item', moreActive && 'bottombar__item--active')}
        onClick={onMore}
        aria-expanded={moreOpen}
        aria-haspopup="dialog"
      >
        <span className="bottombar__icon" aria-hidden="true"><IconMore /></span>
        <span className="bottombar__label micro">More</span>
      </button>
    </nav>
  );
}
