import type { ElementType, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import './Card.css';

export type CardSurface = 'paper' | 'mint' | 'ink';

export interface CardProps {
  surface?: CardSurface;
  /** `label` token above the headline. */
  eyebrow?: ReactNode;
  /** display-4 Anton — a card headline, not a page heading. */
  title?: ReactNode;
  /** Sits opposite the title: a count chip, a ghost action. */
  aside?: ReactNode;
  /** Full-width action pinned under the body (§5.2). */
  action?: ReactNode;
  /** The one tape or pin the screen is allowed, absolutely placed (§6.3). */
  decoration?: ReactNode;
  /** Renders as `section` by default; pass `article` or `li` where it fits. */
  as?: ElementType;
  children?: ReactNode;
  className?: string;
}

/**
 * §5.2 — the card anatomy. No border, no shadow: cards separate from the black
 * ground by contrast alone, and adding a border is the single fastest way to
 * make this look like Bootstrap.
 *
 * Callers alternate paper → mint → paper down a stack (§5.1) — the component
 * cannot see its siblings, so that rule stays with whoever builds the stack.
 */
export function Card({
  surface = 'paper',
  eyebrow,
  title,
  aside,
  action,
  decoration,
  as: Tag = 'section',
  children,
  className,
}: CardProps) {
  const hasHeader = Boolean(eyebrow || title || aside);

  return (
    <Tag className={cn('card', `surface-${surface}`, Boolean(decoration) && 'card--decorated', className)}>
      {decoration}

      {hasHeader && (
        <header className="card__head">
          <div className="card__heading">
            {eyebrow && <p className="card__eyebrow label">{eyebrow}</p>}
            {title && <h2 className="card__title display-4">{title}</h2>}
          </div>
          {aside && <div className="card__aside">{aside}</div>}
        </header>
      )}

      {children}

      {action && <div className="card__action">{action}</div>}
    </Tag>
  );
}
