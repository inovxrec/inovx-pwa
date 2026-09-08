import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LANDING_BY_ROLE } from '../../lib/navConfig';
import {
  Avatar, AvatarStack, Button, Checkbox, Chip, DatePicker, IconButton, Input,
  Menu, Popover, ProgressBar, Radio, Select, Skeleton, SkeletonTaskCard,
  StatePill, Switch, Tag, Textarea, Tooltip,
  type TaskState,
} from '../../ui/primitives';
import { Logo } from '../../ui/brand/Logo';
import { BrushStroke, Grooves, Halftone, Pin, Tape, Waveform } from '../../ui/signature';
import {
  StickerBell, StickerCalendar, StickerClipboard, StickerCloudOff, StickerCoffee,
  StickerLock, StickerPin, StickerRocket, StickerTrophy,
} from '../../ui/stickers';
import './KitchenSink.css';

/*
  Phase 1 review route (§13). Every primitive, in every variant and every one of
  its six states, on both a paper and an ink ground.

  This route is a review surface, not a product screen — it is the one place in
  the codebase exempt from the "one flame per view" rule, since showing the
  brush button at all requires rendering it.
*/

const CHANNELS = ['technical', 'management', 'events', 'media', 'design', 'core'] as const;
const STATES: TaskState[] = ['todo', 'progress', 'review', 'done', 'blocked', 'proposed', 'cancelled'];

const SEARCH_ICON = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <circle cx="9" cy="9" r="6" />
    <path d="M13.5 13.5L17 17" />
  </svg>
);

const PLUS_ICON = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 4v12M4 10h12" />
  </svg>
);

const DOMAIN_OPTIONS = [
  { value: 'technical', label: 'Technical', group: 'Domains', dot: 'var(--dom-technical)' },
  { value: 'management', label: 'Management', group: 'Domains', dot: 'var(--dom-management)' },
  { value: 'events', label: 'Events', group: 'Domains', dot: 'var(--dom-events)' },
  { value: 'media', label: 'Media & PR', group: 'Domains', dot: 'var(--dom-media)' },
  { value: 'design', label: 'Design', group: 'Domains', dot: 'var(--dom-design)' },
  { value: 'core', label: 'Core team', group: 'Committees', dot: 'var(--dom-core)' },
  { value: 'archive', label: 'Archived board', group: 'Committees', disabled: true },
];

const PEOPLE = [
  { name: 'Riya S.', initials: 'RS', channel: 'design' as const },
  { name: 'Ananya R.', initials: 'AR', channel: 'events' as const },
  { name: 'Dev K.', initials: 'DK', channel: 'technical' as const },
  { name: 'Meera N.', initials: 'MN', channel: 'media' as const },
  { name: 'Sahil P.', initials: 'SP', channel: 'management' as const },
];

/** A titled block. `tone` sets the ground everything inside it sits on. */
function Section({
  title,
  note,
  tone,
  children,
}: {
  title: string;
  note?: string;
  tone: 'paper' | 'mint' | 'ink';
  children: ReactNode;
}) {
  return (
    <section className={`ks-section surface-${tone}`}>
      <header className="ks-section__head">
        <h2 className="display-4">{title}</h2>
        {note && <p className="ks-section__note body-sm">{note}</p>}
      </header>
      <div className="ks-section__body">{children}</div>
    </section>
  );
}

/** A labelled row of specimens. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ks-row">
      <p className="ks-row__label micro">{label}</p>
      <div className="ks-row__items">{children}</div>
    </div>
  );
}

export function KitchenSink() {
  const { session } = useAuth();
  const [text, setText] = useState('Birthday poster');
  const [bio, setBio] = useState('');
  const [domain, setDomain] = useState<string | string[]>('design');
  const [multi, setMulti] = useState<string | string[]>(['design', 'events']);
  const [searchable, setSearchable] = useState<string | string[]>('');
  const [date, setDate] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>(['design']);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('grant');
  const [switched, setSwitched] = useState(true);
  const [labels, setLabels] = useState(['poster', 'urgent', 'print']);

  function toggleFilter(id: string) {
    setFilters((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  return (
    <div className="ks">
      <header className="ks-hero">
        <Halftone />
        <Grooves origin={{ x: 78, y: 30 }} />
        <div className="ks-hero__inner">
          <Logo size="md" />
          <h1 className="display-1">Kitchen sink</h1>
          <p className="ks-hero__sub">
            Phase 1 — tokens, type, the signature elements and every primitive.
          </p>
          <Waveform seed="kitchen sink" bars={44} variant="rule" className="ks-hero__wave" />
        </div>
      </header>

      <main className="ks-main">
        {/*
          The role switcher that used to sit here went with Phase 3: the session
          now comes from Supabase, so the way to see another role is to sign in
          as one.
        */}
        <Section
          title="Session"
          note={session ? `Signed in as ${session.name} — ${session.role}.` : 'Signed out.'}
          tone="mint"
        >
          <Row label="Landing screen for this role">
            <Link className="ks-link" to={session ? LANDING_BY_ROLE[session.role] : '/'}>
              Open the shell at {session ? LANDING_BY_ROLE[session.role] : '/'}
            </Link>
            <Link className="ks-link" to="/403">403</Link>
            <Link className="ks-link" to="/500">500</Link>
            <Link className="ks-link" to="/nope">404</Link>
          </Row>
        </Section>

        {/* ---------------- TYPE ---------------- */}
        <Section title="Type scale" note="§4.1 — the whole system. Nothing sets a font-size directly." tone="paper">
          <p className="display-1">Display 1</p>
          <p className="display-2">Display 2</p>
          <p className="display-3">Display 3</p>
          <p className="display-4">Display 4</p>
          <p className="num-xl tnum">1,248</p>
          <p className="body-lg read-width">
            Body large — intro paragraphs and task descriptions, capped at the 68ch measure so a
            line never runs past what the eye can track.
          </p>
          <p className="body read-width">Body — the default. Task titles use Inter 600 at this size.</p>
          <p className="body-sm read-width">Body small — table cells, comment bodies, secondary info.</p>
          <p className="label">Label · uppercase · 0.12em</p>
          <p className="micro">Micro · timestamps and counts</p>
          <p className="ks-quote">you're clear — go make something</p>
        </Section>

        {/* ---------------- COLOUR ---------------- */}
        <Section title="Tokens" note="§3 — every colour in the product." tone="paper">
          <Row label="Paper stock">
            {['paper', 'paper-hi', 'paper-lo', 'mint', 'mint-hi', 'mint-lo'].map((t) => (
              <span key={t} className="ks-swatch" style={{ background: `var(--${t})` }}>
                <span className="micro">{t}</span>
              </span>
            ))}
          </Row>
          <Row label="Flame — the one accent">
            {['flame', 'flame-hover', 'flame-press'].map((t) => (
              <span key={t} className="ks-swatch ks-swatch--dark" style={{ background: `var(--${t})` }}>
                <span className="micro">{t}</span>
              </span>
            ))}
          </Row>
          <Row label="Domain channels">
            {CHANNELS.map((c) => (
              <span key={c} className="ks-swatch" style={{ background: `var(--dom-${c})` }}>
                <span className="micro">{c}</span>
              </span>
            ))}
          </Row>
          <Row label="Semantic state">
            {STATES.map((s) => (
              <span key={s} className="ks-swatch ks-swatch--dark" style={{ background: `var(--st-${s})` }}>
                <span className="micro">{s}</span>
              </span>
            ))}
          </Row>
        </Section>

        {/* ---------------- SIGNATURE ---------------- */}
        <Section title="Signature elements" note="§6 — what makes this look like the reference." tone="paper">
          <Row label="Brush — three variants, seeded from the label">
            {[0, 1, 2].map((v) => (
              <span key={v} className="ks-brush">
                <BrushStroke variant={v} />
              </span>
            ))}
          </Row>
          <Row label="Tape and pin — max one per screen">
            <span className="ks-deco">
              <Tape channel="events" corner="top-left" />
              <span className="body-sm">tape</span>
            </span>
            <span className="ks-deco">
              <Pin />
              <span className="body-sm">pin</span>
            </span>
          </Row>
          <Row label="Stickers — 48px inline">
            <StickerClipboard size="inline" />
            <StickerCalendar size="inline" />
            <StickerBell size="inline" />
            <StickerLock size="inline" />
            <StickerTrophy size="inline" />
            <StickerCoffee size="inline" />
            <StickerRocket size="inline" />
            <StickerPin size="inline" />
            <StickerCloudOff size="inline" />
          </Row>
          <Row label="Sticker — 96px empty-state size, stuck">
            <StickerCoffee size="empty" stuck />
          </Row>
        </Section>

        {/* ---------------- BUTTONS ON PAPER ---------------- */}
        <Section title="Button — on paper" note="§7.1 — all seven variants, all six states." tone="paper">
          <Row label="Rest">
            <Button variant="brush">Sign in</Button>
            <Button variant="brush-ink">Book</Button>
            <Button variant="solid">Approve</Button>
            <Button variant="outline">Request changes</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete</Button>
          </Row>
          <Row label="Loading — width is pinned, label becomes dots">
            <Button variant="brush" loading>Sign in</Button>
            <Button variant="solid" loading>Approve</Button>
            <Button variant="outline" loading>Request changes</Button>
          </Row>
          <Row label="Disabled">
            <Button variant="brush" disabled>Sign in</Button>
            <Button variant="solid" disabled>Approve</Button>
            <Button variant="outline" disabled>Request changes</Button>
            <Button variant="ghost" disabled>Cancel</Button>
            <Button variant="danger" disabled>Delete</Button>
          </Row>
          <Row label="Sizes — sm / md / lg">
            <Button variant="solid" size="sm">Small</Button>
            <Button variant="solid" size="md">Medium</Button>
            <Button variant="solid" size="lg">Large</Button>
          </Row>
          <Row label="With icon, and full width">
            <Button variant="solid" icon={PLUS_ICON}>Add member</Button>
          </Row>
          <Button variant="brush" fullWidth>Full width — mobile card footer</Button>
          <Row label="Icon buttons">
            <IconButton label="Search" icon={SEARCH_ICON} />
            <IconButton label="Add" icon={PLUS_ICON} />
            <IconButton label="Search" icon={SEARCH_ICON} disabled />
          </Row>
        </Section>

        {/* ---------------- BUTTONS ON INK ---------------- */}
        <Section title="Button — on black" note="Nav chrome and full-bleed hero sections." tone="ink">
          <Row label="Rest">
            <Button variant="brush">Install</Button>
            <Button variant="outline-light">See all</Button>
            <Button variant="ghost">Skip</Button>
          </Row>
          <Row label="Loading and disabled">
            <Button variant="brush" loading>Install</Button>
            <Button variant="outline-light" disabled>See all</Button>
          </Row>
          <Row label="Icon buttons">
            <IconButton label="Search" icon={SEARCH_ICON} tone="ink" />
            <IconButton label="Add" icon={PLUS_ICON} tone="ink" />
          </Row>
        </Section>

        {/* ---------------- CHIPS, TAGS, PILLS ---------------- */}
        <Section title="Chip · Tag · StatePill — on paper" note="§7.2–7.4" tone="paper">
          <Row label="Chip — static, with and without an icon">
            <Chip>Traditional</Chip>
            <Chip icon={SEARCH_ICON}>From ₹230</Chip>
            <Chip disabled>Disabled</Chip>
          </Row>
          <Row label="Chip — toggle (filter)">
            {CHANNELS.slice(0, 5).map((c) => (
              <Chip
                key={c}
                variant="toggle"
                selected={filters.includes(c)}
                onClick={() => toggleFilter(c)}
              >
                {c}
              </Chip>
            ))}
          </Row>
          <Row label="Chip — removable">
            {labels.map((l) => (
              <Chip
                key={l}
                variant="removable"
                onRemove={() => setLabels((ls) => ls.filter((x) => x !== l))}
              >
                {l}
              </Chip>
            ))}
            {labels.length === 0 && <span className="body-sm">all removed — reload to reset</span>}
          </Row>
          <Row label="Chip — channel">
            {CHANNELS.map((c) => (
              <Chip key={c} variant="channel" channel={c}>{c}</Chip>
            ))}
          </Row>
          <Row label="Tag — domain, state, flame">
            <Tag channel="design">Design</Tag>
            <Tag channel="events">Events</Tag>
            <Tag state="blocked">3 blocked</Tag>
            <Tag flame>Rank 1</Tag>
          </Row>
          <Row label="StatePill — three signals, never colour alone">
            {STATES.map((s) => <StatePill key={s} state={s} />)}
          </Row>
        </Section>

        <Section title="Chip · StatePill — on black" tone="ink">
          <Row label="Chip">
            <Chip tone="ink">Flexible calendar</Chip>
            <Chip tone="ink" variant="toggle" selected>Selected</Chip>
            <Chip tone="ink" variant="toggle">Unselected</Chip>
          </Row>
          <Row label="StatePill">
            {STATES.map((s) => <StatePill key={s} state={s} tone="ink" />)}
          </Row>
        </Section>

        {/* ---------------- FORMS ---------------- */}
        <Section title="Input · Textarea — on paper" note="§7.5 — label above, never a placeholder alone." tone="paper">
          <div className="ks-grid">
            <Input label="Task title" value={text} onChange={(e) => setText(e.target.value)} />
            <Input label="Email" placeholder="you@inovx.club" hint="Issued by the core team." />
            <Input
              label="Password"
              type="password"
              defaultValue="wrong"
              error="Check your email and password."
            />
            <Input label="Read only" value="0142" disabled onChange={() => {}} />
            <Input
              label="Short summary"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={40}
              hint="Counter turns red in the last 10%."
            />
            <Input label="Search" leading={SEARCH_ICON} placeholder="Find a task" />
          </div>
          <Textarea
            label="Description"
            placeholder="What needs doing?"
            maxLength={280}
            hint="Grows from 3 rows to 10, then scrolls."
          />
        </Section>

        <Section title="Input — on black" tone="ink">
          <div className="ks-grid">
            <Input label="Email" tone="ink" placeholder="you@inovx.club" />
            <Input label="Password" tone="ink" type="password" error="Check your email and password." />
          </div>
        </Section>

        {/* ---------------- SELECT / MENU / DATE ---------------- */}
        <Section
          title="Select · Menu · DatePicker"
          note="§7.6 — dropdown at ≥1024px, bottom sheet below. Resize to see the fork."
          tone="paper"
        >
          <div className="ks-grid">
            <Select label="Domain" options={DOMAIN_OPTIONS} value={domain} onChange={setDomain} />
            <Select
              label="Domains (multi)"
              options={DOMAIN_OPTIONS}
              value={multi}
              onChange={setMulti}
              multiple
            />
            <Select
              label="Assignee (searchable)"
              options={PEOPLE.map((p) => ({ value: p.name, label: p.name, dot: `var(--dom-${p.channel})` }))}
              value={searchable}
              onChange={setSearchable}
              searchable
              placeholder="Unassigned"
            />
            <Select
              label="Disabled"
              options={DOMAIN_OPTIONS}
              value=""
              onChange={() => {}}
              disabled
            />
            <Select
              label="With an error"
              options={DOMAIN_OPTIONS}
              value=""
              onChange={() => {}}
              error="Pick a domain before saving."
            />
            <DatePicker label="Due" value={date} onChange={setDate} hint="Today is outlined; the selection is filled." />
          </div>

          <Row label="Menu — destructive items sit below a divider">
            <Menu
              label="Task actions"
              items={[
                { id: 'edit', label: 'Edit task', onSelect: () => {} },
                { id: 'dup', label: 'Duplicate', onSelect: () => {} },
                { id: 'move', label: 'Move to board', disabled: true, onSelect: () => {} },
                { id: 'del', label: 'Delete task', destructive: true, onSelect: () => {} },
              ]}
            />
            <Popover
              label="Quick add"
              trigger={(props) => (
                <button type="button" className="ks-popover-trigger" {...props}>
                  <span className="label">Popover</span>
                </button>
              )}
            >
              <p className="body-sm">Arbitrary content in the Select panel styling.</p>
            </Popover>
            <Tooltip content="Desktop only">
              <span><IconButton label="Help" icon={SEARCH_ICON} /></span>
            </Tooltip>
          </Row>
        </Section>

        {/* ---------------- CONTROLS ---------------- */}
        <Section title="Checkbox · Radio · Switch — on paper" note="§7.8 — 44px hit area, whole label clickable." tone="paper">
          <Row label="Checkbox">
            <Checkbox label="Checked" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <Checkbox label="Unchecked" />
            <Checkbox label="Indeterminate" indeterminate />
            <Checkbox label="Disabled" disabled />
          </Row>
          <Row label="Radio — the permissions three-state">
            {['inherit', 'grant', 'revoke'].map((v) => (
              <Radio
                key={v}
                name="ks-perm"
                label={v}
                value={v}
                checked={radio === v}
                onChange={() => setRadio(v)}
              />
            ))}
            <Radio name="ks-perm-2" label="Disabled" disabled />
          </Row>
          <Row label="Switch">
            <Switch label="Push notifications" checked={switched} onChange={(e) => setSwitched(e.target.checked)} />
            <Switch label="Email digest" />
            <Switch label="Disabled" disabled />
          </Row>
        </Section>

        <Section title="Controls — on black" tone="ink">
          <Row label="All three">
            <Checkbox label="Checked" tone="ink" defaultChecked />
            <Radio name="ks-ink" label="Selected" tone="ink" defaultChecked />
            <Switch label="On" tone="ink" defaultChecked />
          </Row>
        </Section>

        {/* ---------------- AVATARS, PROGRESS, SKELETON ---------------- */}
        <Section title="Avatar · ProgressBar · Skeleton" note="§7.9, §7.17, §7.19" tone="paper">
          <Row label="Avatar — 24 / 32 / 44, initials on the domain colour">
            <Avatar {...PEOPLE[0]} size={24} />
            <Avatar {...PEOPLE[1]} size={32} />
            <Avatar {...PEOPLE[2]} size={44} />
            <Avatar unassigned size={32} />
            <Avatar unassigned size={44} />
          </Row>
          <Row label="AvatarStack — 3 then +n">
            <AvatarStack people={PEOPLE.slice(0, 2)} />
            <AvatarStack people={PEOPLE} />
            <AvatarStack people={PEOPLE} size={32} />
          </Row>
          <div className="ks-stack">
            <ProgressBar label="Design completion" value={72} />
            <ProgressBar label="Management completion" value={34} atRisk />
          </div>
          <Row label="Skeleton — pulse, never a shimmer or a spinner">
            <div className="ks-stack ks-stack--grow">
              <Skeleton width="60%" height="28px" />
              <Skeleton width="90%" />
              <Skeleton width="40%" height="10px" radius="xs" />
            </div>
          </Row>
          <SkeletonTaskCard />
        </Section>

        {/* ---------------- MINT ---------------- */}
        <Section title="Mint stock" note="§5.1 — the second card in a stack. Never two adjacent." tone="mint">
          <Row label="Chips and pills read the same on mint">
            <Chip>Awaiting approval</Chip>
            <Chip variant="channel" channel="technical">Technical</Chip>
            <StatePill state="review" />
            <Tag state="review">waiting 4d</Tag>
          </Row>
          <Row label="Buttons">
            <Button variant="solid">Approve</Button>
            <Button variant="outline">Changes</Button>
          </Row>
        </Section>
      </main>
    </div>
  );
}
