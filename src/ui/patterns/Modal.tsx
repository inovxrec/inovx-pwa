import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { IconClose } from '../icons';
import { IconButton } from '../primitives/IconButton';
import { Sheet } from './Sheet';
import './Modal.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Pinned under the body — the confirm/cancel pair. */
  footer?: ReactNode;
  /**
   * Escape does not close while true; the caller confirms first (§7.14). The
   * scrim and the ✕ still work, so nobody is ever trapped.
   */
  dirty?: boolean;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * §7.14 — a centred modal at 640px and above, and **every modal automatically
 * becomes a bottom sheet below it**. Consumers never write that fork.
 *
 * No shadow: the scrim provides the separation (§7.14).
 */
export function Modal({
  open, onClose, title, footer, dirty = false, children, className,
}: ModalProps) {
  const isWide = useBreakpoint('sm');
  const modalRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !isWide) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    modalRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open, isWide]);

  useEffect(() => {
    if (!open || !isWide) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !dirty) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
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
  }, [open, isWide, dirty, onClose]);

  if (!open) return null;

  // Below 640 this is a sheet, which brings its own focus trap and dismissal.
  if (!isWide) {
    return (
      <Sheet open onClose={onClose} title={title} className={className}>
        {children}
        {footer && <div className="modal__footer">{footer}</div>}
      </Sheet>
    );
  }

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div
        ref={modalRef}
        className={cn('modal', 'surface-paper', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__head">
          <h2 className="modal__title display-3" id="modal-title">{title}</h2>
          <IconButton label="Close" icon={<IconClose />} onClick={onClose} />
        </header>

        <div className="modal__body">{children}</div>

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
