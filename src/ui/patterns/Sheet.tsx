import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import './Sheet.css';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Shown in the header and used as the dialog's accessible name. */
  title: string;
  children: ReactNode;
  className?: string;
}

/** §7.14 — drag past this and the sheet dismisses; short of it, it springs back. */
const DISMISS_THRESHOLD = 120;

/**
 * The mobile bottom sheet (§7.14): full width, --r-xl top corners only, a drag
 * handle, max-height 88vh, drag-to-dismiss.
 *
 * Traps focus, restores it to the trigger on close, sets aria-modal and locks
 * body scroll (§11).
 */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const dragStart = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  // Remember what opened it, move focus in, and give it all back on close.
  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const first = sheetRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      // Focus trap: wrap at both ends rather than escaping to the page behind.
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Reset the drag offset whenever it reopens, so it never starts part-dragged.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setDragY(0);
  }

  if (!open) return null;

  function onPointerDown(e: React.PointerEvent) {
    if (reducedMotion) return;
    dragStart.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) return;
    // Downward only — dragging up must not detach the sheet from the edge.
    setDragY(Math.max(0, e.clientY - dragStart.current));
  }

  function onPointerUp() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > DISMISS_THRESHOLD) onClose();
    else setDragY(0);
  }

  return createPortal(
    <div className="sheet-scrim" onClick={onClose}>
      <div
        ref={sheetRef}
        className={cn('sheet', 'surface-paper', className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet__grip"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="sheet__handle" aria-hidden="true" />
        </div>

        <p className="sheet__title display-4">{title}</p>
        <div className="sheet__body no-scrollbar">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
