import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { describeError } from '../../lib/supabase';
import { fetchTenures } from '../../lib/db/queries';
import type { TenureRow } from '../../lib/db/rows';
import { HANDOVER_STEPS } from '../../lib/admin';
import { Button } from '../../ui/primitives/Button';
import { Tag } from '../../ui/primitives/Tag';
import { Card, EmptyState, Modal } from '../../ui/patterns';
import { StickerClipboard } from '../../ui/stickers';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'archive')!;

/** §9.15 — tenure cards, an export, and the handover as a three-step stepper. */
export function AdminArchive() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const [tenures, setTenures] = useState<TenureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchTenures()
      .then((rows) => !cancelled && setTenures(rows))
      .catch((caught) => !cancelled && setError(describeError(caught)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const last = step === HANDOVER_STEPS.length - 1;
  const current = tenures.find((tenure) => tenure.is_active) ?? tenures[0];

  const dates = (tenure: TenureRow) =>
    `${tenure.start_date.slice(0, 10)} to ${tenure.end_date.slice(0, 10)}`;

  return (
    <AdminPage
      screen={SCREEN}
      actions={
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => toast.show('Export queued — we will email the archive.')}
        >
          Export everything
        </Button>
      }
    >
      {loading ? (
        <SkeletonTaskCard />
      ) : error ? (
        <Card>
          <EmptyState
            sticker={<StickerClipboard size="empty" />}
            title="Could not read the tenures"
            line={error}
          />
        </Card>
      ) : (
        <div className="admin__tenures">
          {tenures.map((tenure) => (
            <Card
              key={tenure.id}
              surface={tenure.is_active ? 'mint' : 'paper'}
              className="admin__tenure"
              title={tenure.name}
              aside={tenure.is_active ? <Tag ink>Current</Tag> : undefined}
            >
              {/*
                A tenure row carries its dates and nothing else. The head count
                and the completed total that §9.15 asks for would each need a
                figure the schema does not keep, so the card says what it knows
                rather than counting something else and calling it that.
              */}
              <p className="body-sm admin__tenure-lead">{dates(tenure)}</p>
              <p className="micro">Member and completion totals are not recorded yet</p>
            </Card>
          ))}
        </div>
      )}

      {/* §9.15's three-step stepper. */}
      <Card title="Hand over to next year">
        <ol className="admin__steps" role="list">
          {HANDOVER_STEPS.map((entry, index) => {
            const state = index < step ? 'done' : index === step ? 'now' : 'ahead';

            return (
              <li className={`admin__step admin__step--${state}`} key={entry.id}>
                <span className="admin__step-no micro track-no">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="admin__step-body">
                  <span className="display-4 admin__step-title">{entry.title}</span>
                  <span className="body-sm admin__step-detail">{entry.detail}</span>
                </span>
                {/* The state is a word, never the position alone (§14 item 11). */}
                <span className="micro admin__step-state">
                  {state === 'done' ? 'Done' : state === 'now' ? 'Now' : 'Next'}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="admin__step-actions">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}

          {last ? (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Hand over
            </Button>
          ) : (
            <Button variant="brush" onClick={() => setStep((s) => s + 1)}>
              {HANDOVER_STEPS[step + 1].title}
            </Button>
          )}
        </div>
      </Card>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Hand the club over?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirming(false);
                setStep(0);
                toast.show('Handover is not wired up yet — nothing was changed.');
              }}
            >
              Hand over
            </Button>
          </>
        }
      >
        <p className="body">
          This archives {current?.name ?? 'the current tenure'}, moves everything
          still open to the incoming team, and emails every member. It cannot be
          undone from here.
        </p>
      </Modal>
    </AdminPage>
  );
}
