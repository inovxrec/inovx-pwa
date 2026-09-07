import { useEffect } from 'react';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import { useToast } from '../../hooks/useToast';

/**
 * Registers the service worker and raises §9.18's update toast.
 *
 * It sits at the app level rather than inside the shell, because the shell only
 * mounts for someone who is signed in — registering there would leave anyone on
 * the login screen without the offline shell they might well need first.
 *
 * Renders nothing.
 */
export function UpdatePrompt() {
  const { updateReady, reload } = useServiceWorker();
  const toast = useToast();

  useEffect(() => {
    if (!updateReady) return;

    // Error tone, so it persists — it carries an action and must not time out
    // before anyone has read it (§7.15).
    toast.show('A new version is ready.', {
      tone: 'error',
      action: { label: 'Reload', onAction: reload },
    });
  }, [updateReady, toast, reload]);

  return null;
}
