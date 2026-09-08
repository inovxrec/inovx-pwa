import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import { NotWired } from './NotWired';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'occasions')!;

/**
 * §9.15's occasion engine.
 *
 * The foundation schema has no occasions table — no rules, no per-occasion
 * outputs, and nothing for the lunar confirmation queue — so there is nothing
 * to read and nothing is invented. The screen's design is in git history and
 * comes back the moment the table does.
 */
export function AdminOccasions() {
  return (
    <AdminPage screen={SCREEN}>
      <NotWired
        what="Occasion rules, their outputs and the lunar date queue"
        needs="an occasions table"
      />
    </AdminPage>
  );
}
