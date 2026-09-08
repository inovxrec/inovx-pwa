import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import './EmptyState.css';

export interface EmptyStateProps {
  /** A §6.2 sticker at its 96px `empty` size, or 132px on a system screen. */
  sticker: ReactNode;
  /** display-3 Anton, uppercased by CSS. */
  title: string;
  /**
   * The Instrument Serif italic line. Every empty state gets its own written
   * line — §14 item 6 rules out a generic "No data".
   */
  line: string;
  /** At most one action (§7.16). */
  action?: ReactNode;
  /** Extra detail between the line and the action — a request id, say. */
  detail?: ReactNode;
  className?: string;
}

/** §7.16 — the place this design system gets to be charming. */
export function EmptyState({ sticker, title, line, action, detail, className }: EmptyStateProps) {
  return (
    <div className={cn('empty', className)}>
      <span className="empty__sticker">{sticker}</span>
      <h2 className="empty__title display-3">{title}</h2>
      <p className="empty__line">{line}</p>
      {detail && <div className="empty__detail">{detail}</div>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
