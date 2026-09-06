import type { ReactNode } from 'react';
import './PageTransition.css';

export interface PageTransitionProps {
  /** Changing this replays the transition — normally the pathname. */
  routeKey: string;
  children: ReactNode;
}

/**
 * §10 — route change is a 200ms fade plus an 8px rise. Nothing slides
 * horizontally, and reduced motion drops the rise (handled in CSS).
 *
 * The key remounts the subtree rather than animating in place, so an
 * interrupted navigation can't leave a half-faded screen behind. React does the
 * bookkeeping — there is no state here to get out of step with the route.
 */
export function PageTransition({ routeKey, children }: PageTransitionProps) {
  return (
    <div key={routeKey} className="page-transition">
      {children}
    </div>
  );
}
