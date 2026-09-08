import { useId, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { IconChevronDown } from '../icons';
import './Accordion.css';

export interface AccordionProps {
  title: string;
  /** Sits opposite the title — a count, a state pill. */
  aside?: ReactNode;
  /** Open on first render. After that the component owns the state. */
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * §7.19 — a 44px trigger row whose chevron rotates, and content that animates
 * its height over --t-base.
 *
 * The content is unmounted while closed rather than hidden, so a long Settings
 * page is not paying to render every section it is not showing.
 */
export function Accordion({
  title, aside, defaultOpen = false, children, className,
}: AccordionProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('accordion', className)}>
      <h3 className="accordion__heading">
        <button
          type="button"
          className="accordion__trigger"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="accordion__title display-4">{title}</span>
          {aside && <span className="accordion__aside">{aside}</span>}
          <span
            className={cn('accordion__chevron', open && 'accordion__chevron--open')}
            aria-hidden="true"
          >
            <IconChevronDown />
          </span>
        </button>
      </h3>

      {open && (
        <div className="accordion__body" id={id}>
          {children}
        </div>
      )}
    </section>
  );
}
