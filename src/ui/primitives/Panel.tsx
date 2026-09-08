import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import './Panel.css';

export interface PanelProps {
  open: boolean;
  onClose: () => void;
  /** The control the panel is anchored to on desktop. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Title shown in the mobile sheet header; also names the panel for AT. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * The shared surface behind Select, Menu, Popover and DatePicker.
 *
 * This is where mobile/desktop fork #4 lives (§8): below lg it renders as a
 * bottom sheet, at lg and above as a dropdown anchored to its trigger. Building
 * it once here is what stops every consumer from writing the fork itself.
 *
 * Panel styling is one of the few places the sticker shadow is allowed (§7.6) —
 * it is what makes the menu feel like a physical card laid on top.
 */
export function Panel({ open, onClose, anchorRef, label, children, className }: PanelProps) {
  const isDesktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<
    { top: number; left: number; width: number; maxHeight: number } | null
  >(null);

  /*
    Anchor the dropdown, flipping it left near the right viewport edge and up
    near the bottom one so it never overflows the screen (§7.6).

    The vertical half matters most for the date picker: a calendar is far taller
    than a menu, and opening one from a field low in a modal used to run off the
    bottom of the window with no way to reach the last fortnight.
  */
  useLayoutEffect(() => {
    if (!open || !isDesktop) return;

    function place() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.max(rect.width, 200);
      const overflowsRight = rect.left + width > window.innerWidth - 8;
      const left = overflowsRight ? Math.max(8, rect.right - width) : rect.left;

      const GAP = 6;
      const EDGE = 8;
      // Measured, not assumed: the panel is already in the DOM by the time this
      // layout effect runs, so its real height decides which way it opens.
      const height = panelRef.current?.offsetHeight ?? 0;
      const below = window.innerHeight - rect.bottom - GAP - EDGE;
      const above = rect.top - GAP - EDGE;

      // Flip up only when that genuinely helps — otherwise stay below and let
      // the panel scroll, which keeps the common case where it fits unchanged.
      const flip = height > below && above > below;

      setPosition({
        top: flip ? Math.max(EDGE, rect.top - GAP - Math.min(height, above)) : rect.bottom + GAP,
        left,
        width,
        maxHeight: Math.max(160, flip ? above : below),
      });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, isDesktop, anchorRef]);

  // Escape closes and returns focus to the trigger (§7.6, §11).
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onClose, anchorRef]);

  // The sheet locks body scroll; the dropdown does not, since it repositions.
  useEffect(() => {
    if (!open || isDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open, isDesktop]);

  if (!open) return null;

  if (!isDesktop) {
    return createPortal(
      <div className="panel-scrim" onClick={onClose}>
        <div
          ref={panelRef}
          className={cn('panel', 'panel--sheet', 'surface-paper', className)}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="panel__handle" aria-hidden="true" />
          <p className="panel__title label">{label}</p>
          <div className="panel__body no-scrollbar">{children}</div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      className={cn('panel', 'panel--drop', 'surface-paper', className)}
      role="dialog"
      aria-label={label}
      style={
        position
          ? {
              top: position.top,
              left: position.left,
              minWidth: position.width,
              maxHeight: position.maxHeight,
            }
          : undefined
      }
    >
      <div className="panel__body no-scrollbar">{children}</div>
    </div>,
    document.body,
  );
}
