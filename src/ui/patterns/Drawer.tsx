import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { IconClose } from '../icons';
import { IconButton } from '../primitives/IconButton';
import './Drawer.css';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Names the dialog. Rendered by the caller inside `children`, not here. */
  label: string;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * §7.14 — 480px from the right, for task detail on desktop. The board stays
 * visible and interactive behind it, which is why the scrim is not clickable
 * through but also does not black the page out.
 *
 * Traps focus, restores it to the trigger, sets aria-modal, locks body scroll,
 * and closes on Escape, on scrim click and on the persistent ✕ (§7.14, §11).
 */
export function Drawer({ open, onClose, label, children, className }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="drawer-scrim" onClick={onClose}>
      <div
        ref={drawerRef}
        className={cn('drawer', 'surface-ink', className)}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <IconButton
          label="Close"
          icon={<IconClose />}
          tone="ink"
          className="drawer__close"
          onClick={onClose}
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
