import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { useClub, useMe } from '../../store/ClubProvider';
import { usePush } from '../../hooks/usePush';
import { describeError } from '../../lib/supabase';
import {
  fetchNotificationPrefs, saveNotificationPrefs, saveOwnName,
} from '../../lib/db/queries';
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
  { id: 'unclaimed', label: 'Work on my board that nobody has picked up' },
  /*
    Only the domain that owns an occasion's output is ever sent these — Design,
    unless a super admin has pointed the occasion somewhere else — so the row is
    hidden from everyone else rather than offered as a switch that would never
    fire, exactly as `oversight` is below.
  */
  { id: 'birthday', label: 'A club birthday needs a poster' },
  /*
    Oversight, and only the President and Vice President ever receive it — the
    row is hidden from everyone else rather than shown as a switch that could
    never fire.
  */
  { id: 'oversight', label: 'Work assigned or submitted anywhere in the club' },
] as const;

const CHANNELS = [
  { id: 'inApp', label: 'In-app' },
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
] as const;

type EventId = (typeof EVENTS)[number]['id'];
type ChannelId = (typeof CHANNELS)[number]['id'];
type Matrix = Record<EventId, Record<ChannelId, boolean>>;

/*
  Everything on, for every event, until the person says otherwise.

  Mirrors `wants_notification` in 20260924000000_notifications_on_by_default.sql.
  The two are one decision written twice — change them together, or the screen
  will show a default the database does not honour.

  Note what the push column here does and does not mean. It is the second of two
  gates, not the first: a browser only delivers push to a device whose owner has
  clicked through its permission prompt, and no default of ours can grant that.
  So `push: true` means "once you turn this device on, send me everything",
  which is why the control above the matrix — the one that actually asks the
  browser — is a separate thing and stays that way.
*/
const DEFAULT_MATRIX = Object.fromEntries(
  EVENTS.map((event) => [event.id, { inApp: true, push: true, email: true }]),
) as Matrix;

/** §9.14 — accordion sections, with sign-out behind a confirm at the bottom. */
export function Settings() {
  const { session, logout } = useAuth();
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const toast = useToast();

  const [matrix, setMatrix] = useState<Matrix>(DEFAULT_MATRIX);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const push = usePush(session?.userId);

  const { members, tenureId, reload } = useClub();
  const me = useMe();
  const member = members.find((m) => m.id === me?.id);

  /*
    A switch is offered only to people the event can actually reach (§14 item
    13 — a control that could never do anything does not belong on the screen).

    Oversight goes to the core team alone. Birthdays go to the domain that owns
    the occasion's output, which is Design unless a super admin has repointed a
    particular occasion on §9.15's screen; this reads the common case rather
    than fetching every occasion to find out, so a repointed occasion notifies
    that domain correctly but its members will not find the switch here until
    the default moves with it.
  */
  const visibleEvents = EVENTS.filter((event) => {
    if (event.id === 'oversight') return session?.role === 'super-admin';
    if (event.id === 'birthday') {
      return member?.domain === 'design' || session?.role === 'super-admin';
    }
    return true;
  });

  // What the server already holds, so the switches show the truth on arrival.
  useEffect(() => {
    if (!session?.userId) return;
    let cancelled = false;

    fetchNotificationPrefs(session.userId)
      .then((saved: Record<string, Record<string, boolean>> | null) => {
        if (cancelled || !saved) return;
        setMatrix((current) => {
          const merged = { ...current };
          for (const event of EVENTS) {
            merged[event.id] = { ...current[event.id], ...(saved[event.id] ?? {}) };
          }
          return merged;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  const [name, setName] = useState(session?.name ?? '');
  const title = member?.title ?? '';

  /*
    Saved as it is switched rather than behind a Save button: it is one small
    row, and a preferences screen that silently keeps changes in memory is how
    people end up believing they turned something off.
  */
  function set(event: EventId, channel: ChannelId, value: boolean) {
    const next: Matrix = { ...matrix, [event]: { ...matrix[event], [channel]: value } };
    setMatrix(next);

    if (!session?.userId || !tenureId) return;

    void saveNotificationPrefs(tenureId, session.userId, next).catch((caught: unknown) => {
      // Put the switch back rather than leave it showing a preference nobody holds.
      setMatrix(matrix);
      toast.show(describeError(caught), { tone: 'error' });
    });
  }

  async function saveProfile() {
    if (!session?.userId) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === session.name) return;

    setSavingProfile(true);
    try {
      await saveOwnName(session.userId, trimmed);
      await reload();
      toast.show('Profile saved.', { tone: 'success' });
    } catch (caught: unknown) {
      toast.show(describeError(caught), { tone: 'error' });
    } finally {
      setSavingProfile(false);
    }
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
            {/*
              Read-only for the same reason as the email: a position is the
              club's claim about someone, not their own, and the server refuses
              a self-edit of it. An editable box that always failed would be
              worse than no box.
            */}
            <Input
              label="Position"
              value={title}
              readOnly
              hint="Ask the core team to change this."
            />
            {/* Read-only: the email is the account, and the core team owns it. */}
            <Input
              label="Email"
              value={session?.email ?? ''}
              readOnly
              hint="Ask the core team to change this."
            />
          </div>

          <Button
            variant="outline"
            loading={savingProfile}
            disabled={!name.trim() || name.trim() === session?.name}
            onClick={() => void saveProfile()}
          >
            Save profile
          </Button>
        </Accordion>

        <Accordion title="Notifications">
          {/*
            §9.14 — a matrix on desktop, a per-event accordion on mobile, and
            never a horizontally scrolling grid.
          */}

          {/*
            Push is a per-device permission, not a preference, so it gets its own
            control above the matrix: the switches below say which events you
            want, this says whether this particular phone or laptop is allowed
            to buzz at all. One without the other does nothing.
          */}
          <div className="settings__push">
            {push.state === 'unsupported' && (
              <p className="body-sm settings__note">
                This browser cannot show notifications when INOVX is closed.
              </p>
            )}

            {push.state === 'needs-install' && (
              <p className="body-sm settings__note">
                On iPhone, add INOVX to your home screen first — Safari tabs
                cannot receive notifications. The Install section below shows how.
              </p>
            )}

            {push.state === 'denied' && (
              <p className="body-sm settings__note">
                Notifications are blocked for this site. Your browser will not let
                the app ask again — turn them back on in its site settings.
              </p>
            )}

            {(push.state === 'default' || push.state === 'granted') && (
              <div className="settings__push-row">
                <span className="body-sm">
                  {push.subscribed
                    ? 'This device will buzz when something needs you.'
                    : 'Get alerts on this device when INOVX is closed.'}
                </span>
                <Button
                  variant={push.subscribed ? 'outline' : 'brush'}
                  size="sm"
                  loading={push.busy}
                  onClick={() => void (push.subscribed ? push.disable() : push.enable())}
                >
                  {push.subscribed ? 'Turn off here' : 'Turn on for this device'}
                </Button>
              </div>
            )}

            {push.error && (
              <p className="body-sm settings__push-error" role="alert">{push.error}</p>
            )}
          </div>

          {/*
            Email still sends nothing, and the matrix should not imply otherwise
            — which matters more now that every cell starts switched on. A row
            of ticks is a promise, and this is the line that keeps it from being
            a false one.
          */}
          <p className="body-sm settings__note">
            Everything starts switched on. In-app works now, and push works on
            any device you turn it on for, below. Email has no sender configured
            yet — those ticks record what you want and send nothing until it
            does.
          </p>
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
                {visibleEvents.map((event) => (
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
              {visibleEvents.map((event) => (
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
