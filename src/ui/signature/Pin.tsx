import { cn } from '../../lib/cn';
import './signature.css';

/**
 * The pin sticker (§6.3) — the alternative to Tape, under the same
 * one-per-screen rule. Decorative only.
 */
export function Pin({ className }: { className?: string }) {
  return (
    <span className={cn('pin', className)} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15.5v6" strokeLinecap="round" />
        <path d="M8.5 3.2h7l-.9 6.1 2.6 2.8a1 1 0 0 1-.73 1.68H6.53a1 1 0 0 1-.73-1.68l2.6-2.8-.9-6.1Z" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
