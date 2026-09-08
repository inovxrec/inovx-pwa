import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import './SectionHeader.css';

export interface SectionHeaderProps {
  title: string;
  /** One ghost action, right-aligned — "See all". */
  action?: ReactNode;
  /** Which ground it sits on; decides the rule and text colours. */
  tone?: 'paper' | 'ink';
  /** Heading level. The Header owns the page's h1, so sections start at h2. */
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * §7.11 — display-4 Anton on the left, an optional ghost action on the right,
 * a hairline rule beneath.
 *
 * §14 item 4 caps the gap under it at 24px, which is why the spacing lives here
 * rather than being left to each screen.
 */
export function SectionHeader({
  title,
  action,
  tone = 'ink',
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('section-head', `section-head--on-${tone}`, className)}>
      <Heading className="section-head__title display-4">{title}</Heading>
      {action && <div className="section-head__action">{action}</div>}
    </div>
  );
}
