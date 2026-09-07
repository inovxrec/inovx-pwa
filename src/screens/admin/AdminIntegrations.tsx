import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { HEALTH_LABELS, INTEGRATIONS, type Integration } from '../../lib/admin';
import { relativeTime } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Card, EmptyState } from '../../ui/patterns';
import { StickerCloudOff } from '../../ui/stickers';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'integrations')!;

/** §9.15 — sync status, last sync, run now, manual upload, and conflicts. */
export function AdminIntegrations() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [running, setRunning] = useState<string | null>(null);

  function runNow(integration: Integration) {
    setRunning(integration.id);

    // TEMP: the real thing posts to /integrations/:id/sync and polls. The delay
    // stands in for that so the button's loading state is exercised.
    window.setTimeout(() => {
      setIntegrations((current) =>
        current.map((item) =>
          item.id === integration.id
            ? { ...item, health: 'ok', lastSync: new Date().toISOString(), conflicts: [] }
            : item,
        ),
      );
      setRunning(null);
      toast.show(`${integration.name} synced.`, { tone: 'success' });
    }, 900);
  }

  return (
    <AdminPage
      screen={SCREEN}
      actions={
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => toast.show('Manual CSV upload is not wired up yet.')}
        >
          Upload CSV
        </Button>
      }
    >
      {integrations.length === 0 && (
        <Card>
          <EmptyState
            sticker={<StickerCloudOff size="empty" />}
            title="Nothing connected"
            line="INOVX is not syncing with anything yet"
          />
        </Card>
      )}

      {integrations.map((integration) => (
        <Card
          key={integration.id}
          surface={integration.health === 'ok' ? 'paper' : 'mint'}
          title={integration.name}
          aside={
            <Button
              variant="outline"
              size="sm"
              loading={running === integration.id}
              onClick={() => runNow(integration)}
            >
              Run now
            </Button>
          }
        >
          {/*
            The status bar is colour AND a word — a green bar alone would be
            the only signal that something is fine or broken (§14 item 11).
          */}
          <div className={`admin__health admin__health--${integration.health}`}>
            <span className="admin__health-bar" aria-hidden="true" />
            <span className="label admin__health-word">{HEALTH_LABELS[integration.health]}</span>
            <span className="micro admin__health-time">
              last synced {relativeTime(integration.lastSync)} ago
            </span>
          </div>

          <p className="body-sm admin__note">{integration.note}</p>

          {integration.conflicts.length > 0 && (
            <div className="admin__conflicts">
              <p className="label admin__conflicts-head">
                {integration.conflicts.length}{' '}
                {integration.conflicts.length === 1 ? 'conflict' : 'conflicts'}
              </p>
              <ul className="admin__conflict-list" role="list">
                {integration.conflicts.map((conflict) => (
                  <li className="body-sm admin__conflict" key={conflict}>
                    {conflict}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}
    </AdminPage>
  );
}
