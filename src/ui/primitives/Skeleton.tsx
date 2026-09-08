import { cn } from '../../lib/cn';
import './Skeleton.css';

export interface SkeletonProps {
  /** Any token-legal length. Matches the shape of what is loading (§7.17). */
  width?: string;
  height?: string;
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'pill';
  className?: string;
}

/**
 * §7.17 — a paper-coloured block with a slow opacity pulse. There is no
 * shimmer sweep, and there is no spinner anywhere in the product.
 */
export function Skeleton({ width = '100%', height = '16px', radius = 'sm', className }: SkeletonProps) {
  return (
    <span
      className={cn('skeleton', className)}
      style={{ width, height, borderRadius: `var(--r-${radius})` }}
      aria-hidden="true"
    />
  );
}

/** A skeleton that looks like a TaskCard, for board and list loading states. */
export function SkeletonTaskCard() {
  return (
    <div className="skeleton-card surface-paper" aria-hidden="true">
      <Skeleton width="40%" height="10px" radius="xs" />
      <Skeleton width="85%" height="15px" />
      <div className="skeleton-card__foot">
        <Skeleton width="88px" height="24px" radius="pill" />
        <Skeleton width="64px" height="10px" radius="xs" />
      </div>
    </div>
  );
}
