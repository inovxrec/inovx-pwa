import { useState } from 'react';
import { AppShell } from './AppShell';
import { useAuth } from '../store/authStore';
import { BootSequence } from '../features/boot/BootSequence';

/**
 * Sits above the routed AppShell. Plays the boot sequence exactly once per
 * browser session (sessionStorage flag) and only when a session already
 * exists — Login itself never shows the boot animation.
 */
export function AuthedShell() {
  const { session } = useAuth();
  const [bootDone, setBootDone] = useState(() => sessionStorage.getItem('inovx84-booted') === '1');

  if (!session) return null; // RequireAuth handles the redirect before this renders

  if (!bootDone) {
    return (
      <BootSequence
        operatorName={session.name}
        channel={session.role}
        personalLine="3 TASKS DUE · 1 OVERDUE"
        onDone={() => {
          sessionStorage.setItem('inovx84-booted', '1');
          setBootDone(true);
        }}
      />
    );
  }

  return <AppShell role={session.role} userInitials={session.initials} />;
}
