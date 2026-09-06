import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsDesktop } from './useBreakpoint';
import type { Task } from '../lib/tasks';

/** The search param the desktop drawer is driven by. */
export const TASK_PARAM = 'task';

/**
 * Opens a task the way this breakpoint is supposed to — responsive fork #3
 * (§8, §9.8).
 *
 * On desktop it adds `?task=<id>` to whatever screen you are on, so the board
 * (or My Day) stays mounted, visible and interactive behind the drawer, which
 * a plain route change could not do. On mobile it navigates to the full-screen
 * route.
 *
 * Either way the URL identifies the task, so a link still works.
 */
export function useOpenTask(): (task: Task | string) => void {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  return useCallback(
    (task: Task | string) => {
      const id = typeof task === 'string' ? task : task.id;

      if (!isDesktop) {
        navigate(`/task/${id}`);
        return;
      }

      const next = new URLSearchParams(params);
      next.set(TASK_PARAM, id);
      setParams(next);
    },
    [isDesktop, navigate, params, setParams],
  );
}

/** Clears the drawer without disturbing any other search param. */
export function useCloseTask(): () => void {
  const [params, setParams] = useSearchParams();

  return useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete(TASK_PARAM);
    setParams(next, { replace: true });
  }, [params, setParams]);
}
