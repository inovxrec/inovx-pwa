import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { HANDOVER_STEPS, TENURES } from '../../lib/admin';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Tag } from '../../ui/primitives/Tag';
import { Card, Modal } from '../../ui/patterns';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'archive')!;

/** §9.15 — tenure cards, an export, and the handover as a three-step stepper. */
export function AdminArchive() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const last = step === HANDOVER_STEPS.length - 1;

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
      <div className="admin__tenures">
        {TENURES.map((tenure) => (
          <Card
            key={tenure.id}
            surface={tenure.current ? 'mint' : 'paper'}
            className="admin__tenure"
            title={tenure.label}
            aside={tenure.current ? <Tag ink>Current</Tag> : undefined}
          >
            <div className="admin__tenure-lead">
              <Avatar
                size={32}
                name={tenure.president.name}
                initials={tenure.president.initials}
                channel={tenure.president.domain}
              />
              <span className="body-sm">{tenure.president.name}, president</span>
            </div>

            <dl className="admin__tenure-stats">
              <div>
                <dt className="label">Members</dt>
                <dd className="num-xl tnum">{tenure.members}</dd>
              </div>
              <div>
                <dt className="label">Completed</dt>
                <dd className="num-xl tnum">{tenure.tasksCompleted}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

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
          This archives {TENURES[0].label}, moves everything still open to the
          incoming team, and emails all {TENURES[0].members} members. It cannot
          be undone from here.
        </p>
      </Modal>
    </AdminPage>
  );
}
