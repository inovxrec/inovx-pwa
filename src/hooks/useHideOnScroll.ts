import { useEffect, useRef, useState } from 'react';
import { useIsDesktop } from './useBreakpoint';

/** Ignore sub-pixel jitter and rubber-banding at the extremes. */
const THRESHOLD = 8;

/**
 * §7.18 — the header hides on scroll-down and reappears on scroll-up, on mobile
 * only. Returns true while the header should be visible.
 */
export function useHideOnScroll(): boolean {
  const isDesktop = useIsDesktop();
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    // The return value already pins the header visible on desktop, so there is
    // nothing to listen for above lg.
    if (isDesktop) return;

    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) < THRESHOLD) return;
      // Always show the header at the very top, whatever the direction.
      setVisible(delta < 0 || y < 64);
      lastY.current = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isDesktop]);

  return isDesktop ? true : visible;
}
