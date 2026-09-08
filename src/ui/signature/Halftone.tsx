import { cn } from '../../lib/cn';
import './signature.css';

/**
 * The printed-dot texture (§6.4). Only ever on an --ink ground, never on paper,
 * and never animated. Purely decorative.
 */
export function Halftone({ className }: { className?: string }) {
  return <div className={cn('halftone', className)} aria-hidden="true" />;
}
