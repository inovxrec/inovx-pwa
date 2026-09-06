import { useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Panel } from './Panel';
import './Popover.css';

export interface PopoverProps {
  /** The control that opens it. Rendered as given; the ref is attached here. */
  trigger: (props: {
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'dialog';
  }) => ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * §7.19 — Select panel styling for arbitrary content. Same fork as everything
 * else built on Panel: dropdown on desktop, bottom sheet on mobile.
 */
export function Popover({ trigger, label, children, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <div className={cn('popover', className)}>
      {trigger({
        ref,
        onClick: () => setOpen((o) => !o),
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
      })}
      <Panel open={open} onClose={() => setOpen(false)} anchorRef={ref} label={label}>
        <div className="popover__body">{children}</div>
      </Panel>
    </div>
  );
}
