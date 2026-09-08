import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { describeError } from '../../lib/supabase';
import { fetchIntegrations, requestIntegrationSync } from '../../lib/db/queries';
import { useClub } from '../../store/ClubProvider';
import { HEALTH_LABELS, type Integration } from '../../lib/admin';
import { relativeTime } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import { Card, EmptyState } from '../../ui/patterns';
import { StickerCloudOff } from '../../ui/stickers';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'integrations')!;

/** §9.15 — sync status, last sync, run now, manual upload, and conflicts. */
export function AdminIntegrations() {
  const toast = useToast();
  const { tenureId } = useClub();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    if (!tenureId) return;
    let cancelled = false;

    setLoading(true);
    setError('');
    fetchIntegrations(tenureId)
      .then((rows) => !cancelled && setIntegrations(rows))
      .catch((caught) => !cancelled && setError(describeError(caught)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [tenureId]);

  /*
    Asking is all this can honestly do: nothing runs the syncs yet, so the
    request is recorded and the card keeps saying how stale it is. Flipping the
    bar green here would be the one lie this screen exists to prevent.
  */
  async function runNow(integration: Integration) {
    setRunning(integration.id);

    try {
      await requestIntegrationSync(integration.id);
      setIntegrations((current) =>
        current.map((item) =>
          item.id === integration.id
            ? { ...item, syncRequestedAt: new Date().toISOString() }
            : item,
        ),
      );
      toast.show(`${integration.name} is queued to sync.`, { tone: 'success' });
    } catch (caught) {
      toast.show(describeError(caught), { tone: 'error' });
    } finally {
      setRunning(null);
    }
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
      {loading && (
        <Card>
          <SkeletonTaskCard />
        </Card>
      )}

      {!loading && error && (
        <Card>
          <EmptyState
            sticker={<StickerCloudOff size="empty" />}
            title="Could not read the integrations"
            line={error}
          />
        </Card>
      )}

      {!loading && !error && integrations.length === 0 && (
        <Card>
          <EmptyState
            sticker={<StickerCloudOff size="empty" />}
            title="Nothing connected"
            line="INOVX is not syncing with anything yet"
          />
        </Card>
      )}

      {!loading &&
        !error &&
        integrations.map((integration) => (
          <Card
            key={integration.id}
            surface={integration.health === 'ok' ? 'paper' : 'mint'}
            title={integration.name}
            aside={
              <Button
                variant="outline"
                size="sm"
                loading={running === integration.id}
                disabled={integration.health === 'disabled'}
                onClick={() => void runNow(integration)}
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
              <span className="label admin__health-word">
                {HEALTH_LABELS[integration.health]}
              </span>
              <span className="micro admin__health-time">
                {integration.lastSync
                  ? `last synced ${relativeTime(integration.lastSync)} ago`
                  : 'never synced'}
              </span>
            </div>

            {integration.note && <p className="body-sm admin__note">{integration.note}</p>}

            {integration.syncRequestedAt && (
              <p className="micro admin__note">
                A sync was asked for {relativeTime(integration.syncRequestedAt)} ago and has
                not reported back yet.
              </p>
            )}

            {integration.conflicts.length > 0 && (
              <div className="admin__conflicts">
                <p className="label admin__conflicts-head">
                  {integration.conflicts.length}{' '}
                  {integration.conflicts.length === 1 ? 'conflict' : 'conflicts'}
                </p>
                <ul className="admin__conflict-list" role="list">
                  {integration.conflicts.map((conflict) => (
                    <li className="body-sm admin__conflict" key={conflict.id}>
                      {conflict.summary}
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
