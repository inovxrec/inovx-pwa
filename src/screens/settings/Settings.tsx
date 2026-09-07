import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { useClub, useMe } from '../../store/ClubProvider';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { Switch } from '../../ui/primitives/Switch';
import { Accordion, Card, InstallCard, Modal } from '../../ui/patterns';
import './Settings.css';

/** The rows of §9.14's notification matrix. */
const EVENTS = [
  { id: 'assigned', label: 'A task is assigned to me' },
  { id: 'due', label: 'Something I own falls due' },
  { id: 'review', label: 'My work is approved or sent back' },
  { id: 'comment', label: 'Someone comments or mentions me' },
  { id: 'meeting', label: 'A meeting is scheduled' },
] as const;

const CHANNELS = [
  { id: 'inApp', label: 'In-app' },
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
] as const;

type EventId = (typeof EVENTS)[number]['id'];
type ChannelId = (typeof CHANNELS)[number]['id'];
type Matrix = Record<EventId, Record<ChannelId, boolean>>;

const DEFAULT_MATRIX = Object.fromEntries(
  EVENTS.map((event) => [
    event.id,
    { inApp: true, push: event.id === 'assigned' || event.id === 'due', email: false },
  ]),
) as Matrix;

/** §9.14 — accordion sections, with sign-out behind a confirm at the bottom. */
export function Settings() {
  const { session, logout } = useAuth();
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const toast = useToast();

  const [matrix, setMatrix] = useState<Matrix>(DEFAULT_MATRIX);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const { members } = useClub();
  const me = useMe();
  const member = members.find((m) => m.id === me?.id);

  const [name, setName] = useState(session?.name ?? '');
  const [title, setTitle] = useState(member?.title ?? '');

  function set(event: EventId, channel: ChannelId, value: boolean) {
    setMatrix((current) => ({
      ...current,
      [event]: { ...current[event], [channel]: value },
    }));
  }

  return (
    <div className="settings">
      <Card className="settings__card">
        <Accordion title="Profile" defaultOpen>
          <div className="settings__profile">
            <Avatar
              size={44}
              name={session?.name}
              initials={session?.initials}
              channel={me?.domain}
            />
            <Button variant="outline" size="sm" onClick={() => toast.show('Photo upload is coming.')}>
              Change photo
            </Button>
          </div>

          <div className="settings__fields">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Position" value={title} onChange={(e) => setTitle(e.target.value)} />
            {/* Read-only: the email is the account, and the core team owns it. */}
            <Input
              label="Email"
              value={session?.email ?? ''}
              readOnly
              hint="Ask the core team to change this."
            />
          </div>

          <Button variant="outline" onClick={() => toast.show('Profile saved.', { tone: 'success' })}>
            Save profile
          </Button>
        </Accordion>

        <Accordion title="Notifications">
          {/*
            §9.14 — a matrix on desktop, a per-event accordion on mobile, and
            never a horizontally scrolling grid.
          */}
          {isDesktop ? (
            <table className="settings__matrix">
              <caption className="sr-only">Which events reach you on which channel</caption>
              <thead>
                <tr>
                  <th scope="col" className="label settings__matrix-th">Event</th>
                  {CHANNELS.map((channel) => (
                    <th scope="col" key={channel.id} className="label settings__matrix-th">
                      {channel.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((event) => (
                  <tr key={event.id}>
                    <th scope="row" className="settings__matrix-row body-sm">{event.label}</th>
                    {CHANNELS.map((channel) => (
                      <td key={channel.id} className="settings__matrix-cell">
                        <Switch
                          label={`${event.label} — ${channel.label}`}
                          labelHidden
                          checked={matrix[event.id][channel.id]}
                          onChange={(e) => set(event.id, channel.id, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="settings__events">
              {EVENTS.map((event) => (
                <Accordion key={event.id} title={event.label}>
                  <div className="settings__switches">
                    {CHANNELS.map((channel) => (
                      <Switch
                        key={channel.id}
                        label={channel.label}
                        checked={matrix[event.id][channel.id]}
                        onChange={(e) => set(event.id, channel.id, e.target.checked)}
                      />
                    ))}
                  </div>
                </Accordion>
              ))}
            </div>
          )}
        </Accordion>

        <Accordion title="Install the app">
          <InstallCard tone="mint" />
        </Accordion>

        <Accordion title="About">
          <dl className="settings__about">
            <div className="settings__about-row">
              <dt className="label">Version</dt>
              <dd className="body-sm tnum">0.5.0 — Phase 6</dd>
            </div>
            <div className="settings__about-row">
              <dt className="label">Tenure</dt>
              <dd className="body-sm">2026–27</dd>
            </div>
            <div className="settings__about-row">
              <dt className="label">Build docs</dt>
              <dd className="body-sm">
                <a href="/INOVX-FRONTEND-BUILD-PROMPT.md" target="_blank" rel="noreferrer">
                  Frontend build prompt
                </a>
              </dd>
            </div>
          </dl>
        </Accordion>
      </Card>

      {/* §9.14 — danger, at the bottom, behind a confirm. */}
      <div className="settings__signout">
        <Button variant="danger" onClick={() => setConfirmSignOut(true)}>
          Sign out
        </Button>
      </div>

      <Modal
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSignOut(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              Sign out
            </Button>
          </>
        }
      >
        <p className="body">
          You will need your email and password to get back in. Nothing you have
          done is lost.
        </p>
      </Modal>
    </div>
  );
}
