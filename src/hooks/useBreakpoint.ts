import { useSyncExternalStore } from 'react';

/**
 * The ONLY place window.matchMedia is read (§12). Every mobile/desktop fork in
 * §8 goes through this hook, so a component never queries the viewport itself.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

function subscribe(bp: Breakpoint) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINTS[bp]}px)`);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  };
}

/** True once the viewport is at or above the named breakpoint. */
export function useBreakpoint(bp: Breakpoint): boolean {
  return useSyncExternalStore(
    subscribe(bp),
    () => window.matchMedia(`(min-width: ${BREAKPOINTS[bp]}px)`).matches,
    () => false, // server / first paint: assume mobile, the denser default
  );
}

/**
 * The fork the §8 table is written against: anything below lg gets the mobile
 * component, not a squashed desktop one.
 */
export function useIsDesktop(): boolean {
  return useBreakpoint('lg');
}
