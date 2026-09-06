import { useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import './Tooltip.css';

export interface TooltipProps {
  /** Short. A tooltip NEVER holds information a mobile user needs (§7.19). */
  content: ReactNode;
  children: ReactElement;
  placement?: 'top' | 'bottom';
  className?: string;
}

const DELAY_MS = 400;

/**
 * §7.19 — desktop only, by design. Below lg the tooltip does not render at all,
 * so anything it would have said must also exist somewhere a touch user can
 * reach.
 */
export function Tooltip({ content, children, placement = 'top', className }: TooltipProps) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();

  if (!isDesktop) return children;

  function show() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), DELAY_MS);
  }

  function hide() {
    window.clearTimeout(timer.current);
    setOpen(false);
  }

  return (
    <span
      className={cn('tooltip-wrap', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {open && (
        <span id={id} role="tooltip" className={cn('tooltip', `tooltip--${placement}`, 'micro')}>
          {content}
        </span>
      )}
    </span>
  );
}
