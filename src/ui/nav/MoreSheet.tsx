import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { NavItem } from '../../lib/navConfig';
import { Sheet } from '../patterns/Sheet';
import { Tag } from '../primitives/Tag';
import './MoreSheet.css';

export interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  /** Every destination that didn't fit the four bottom-bar tabs. */
  items: NavItem[];
  counts?: Record<string, number>;
}

/**
 * §7.18 — the sheet behind the bottom bar's fifth item.
 *
 * Rows are 52px to match the sheet row height the Select fork uses, and the
 * sheet closes before navigating so the route change doesn't animate underneath
 * an open dialog.
 */
export function MoreSheet({ open, onClose, items, counts = {} }: MoreSheetProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Sheet open={open} onClose={onClose} title="More">
      <ul className="more__list">
        {items.map((item) => {
          const Icon = item.icon;
          const count = counts[item.id];
          const isActive = pathname.startsWith(item.path);

          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn('more__item', isActive && 'more__item--active')}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onClose();
                  navigate(item.path);
                }}
              >
                <span className="more__icon" aria-hidden="true"><Icon /></span>
                <span className="more__label">{item.label}</span>
                {count ? <Tag>{count}</Tag> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
