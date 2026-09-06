import { useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Panel } from './Panel';
import { IconButton } from './IconButton';
import './Menu.css';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Destructive items are red and always sit below a divider (§7.7). */
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  /** Names the trigger for screen readers (§11). */
  label: string;
  items: MenuItem[];
  tone?: 'paper' | 'ink';
  className?: string;
}

const OVERFLOW_GLYPH = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <circle cx="4" cy="10" r="1.6" />
    <circle cx="10" cy="10" r="1.6" />
    <circle cx="16" cy="10" r="1.6" />
  </svg>
);

/**
 * §7.7 — the contextual / overflow menu. Same panel styling as Select, so it
 * inherits the bottom-sheet fork on mobile for free.
 */
export function Menu({ label, items, tone = 'paper', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Destructive items are grouped last so the divider is a single, honest rule
  // rather than one per item.
  const normal = items.filter((i) => !i.destructive);
  const destructive = items.filter((i) => i.destructive);

  function renderItem(item: MenuItem) {
    return (
      <li key={item.id}>
        <button
          type="button"
          role="menuitem"
          className={cn('menu__item', item.destructive && 'menu__item--destructive')}
          disabled={item.disabled}
          onClick={() => {
            item.onSelect();
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          {item.icon && <span className="menu__icon" aria-hidden="true">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      </li>
    );
  }

  return (
    <div className={cn('menu', className)}>
      <IconButton
        ref={triggerRef}
        label={label}
        icon={OVERFLOW_GLYPH}
        tone={tone}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      />

      <Panel open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} label={label}>
        <ul className="menu__list" role="menu" aria-label={label}>
          {normal.map(renderItem)}
          {destructive.length > 0 && normal.length > 0 && (
            <li className="menu__divider" role="separator" />
          )}
          {destructive.map(renderItem)}
        </ul>
      </Panel>
    </div>
  );
}
