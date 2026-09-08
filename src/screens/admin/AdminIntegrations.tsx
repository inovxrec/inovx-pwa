import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import { NotWired } from './NotWired';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'integrations')!;

/**
 * §9.15's integrations screen.
 *
 * Nothing in the schema records what INOVX syncs with or whether a sync is
 * healthy, so there is no status to show. A green bar with no measurement
 * behind it would be worse than an empty screen.
 */
export function AdminIntegrations() {
  return (
    <AdminPage screen={SCREEN}>
      <NotWired
        what="Sync status, last-sync times and conflicts"
        needs="an integrations table"
      />
    </AdminPage>
  );
}
