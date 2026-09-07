import { useMemo, useState } from 'react';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useGrants } from '../../store/grantStore';
import { useToast } from '../../hooks/useToast';
import { type Member } from '../../lib/club';
import { useBoards, useClub } from '../../store/ClubProvider';
import { ROLE_DEFAULTS, type PermissionKey } from '../../lib/permissions';
import {
  PERMISSION_GROUPS, type Decision, type PermissionEdits,
} from '../../lib/permissionGroups';
import { DOMAIN_LABELS, type Domain } from '../../lib/tasks';
import type { Role } from '../../store/authStore';
import { cn } from '../../lib/cn';
import { Avatar } from '../../ui/primitives/Avatar';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { IconButton } from '../../ui/primitives/IconButton';
import { Tag } from '../../ui/primitives/Tag';
import { IconChevronLeft } from '../../ui/icons';
import { Accordion, Card, Modal, SearchBar, SegmentedControl } from '../../ui/patterns';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './AdminPermissions.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'permissions')!;

const EMPTY_EDITS: PermissionEdits = Object.freeze({});

/**
 * How many rows differ from what is saved. Measured against the saved state
 * rather than against inherit, so someone who already holds two grants does not
 * see "2 changes" the moment they are selected.
 */
function countChanges(saved: PermissionEdits, edits: PermissionEdits): number {
  const keys = new Set([...Object.keys(saved), ...Object.keys(edits)]) as Set<PermissionKey>;
  let n = 0;

  for (const key of keys) {
    const a = saved[key];
    const b = edits[key];
    const sameDecision = (a?.decision ?? 'inherit') === (b?.decision ?? 'inherit');
    const sameScope =
      (a?.domains ?? []).slice().sort().join() === (b?.domains ?? []).slice().sort().join();
    if (!sameDecision || !sameScope) n += 1;
  }

  return n;
}

const DECISIONS = [
  { id: 'inherit' as const, label: 'Inherit' },
  { id: 'grant' as const, label: 'Grant' },
  { id: 'revoke' as const, label: 'Revoke' },
];

/**
 * The account's own role where there is one. Somebody in the directory with no
 * account has none, and the defaults shown for them are a member's — which is
 * what they would get if an account were issued today.
 */
function roleOf(member: Member): Role {
  return member.role ?? 'member';
}

/**
 * §9.17 — the screen the President uses most.
 *
 * Two panes on desktop; a two-step flow on mobile, which is fork #8 (§8). The
 * editor is one component either way, so the two halves cannot disagree about
 * what a decision means.
 */
export function AdminPermissions() {
  const isDesktop = useIsDesktop();
  const toast = useToast();
  const { forPerson, setForPerson, clearForPerson } = useGrants();
  const { members: roster } = useClub();
  const boards = useBoards();

  const [query, setQuery] = useState('');
  // The roster arrives after the first render, so desktop picks its first
  // person once there is one rather than at init (§8's two-pane fork wants
  // somebody selected; mobile starts on the list).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<PermissionEdits>({});
  /* Loads the saved grants for whoever is selected on first render. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const members = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((m) => `${m.name} ${m.title}`.toLowerCase().includes(needle));
  }, [roster, query]);

  const member = roster.find((m) => m.id === selectedId);

  if (isDesktop && !selectedId && roster.length > 0) {
    setSelectedId(roster[0].id);
  }

  if (selectedId && loadedFor !== selectedId) {
    setLoadedFor(selectedId);
    setEdits(forPerson(selectedId));
  }
  const role = member ? roleOf(member) : 'member';
  const defaults = new Set(ROLE_DEFAULTS[role]);

  const saved = member ? forPerson(member.id) : EMPTY_EDITS;
  const dirtyCount = countChanges(saved, edits);

  function pick(id: string) {
    setSelectedId(id);
    // Start from what is already saved for that person, not from the previous
    // person's unsaved edits.
    setEdits(forPerson(id));
  }

  function decisionFor(key: PermissionKey): Decision {
    return edits[key]?.decision ?? 'inherit';
  }

  function setDecision(key: PermissionKey, decision: Decision) {
    setEdits((current) => ({
      ...current,
      [key]: { decision, domains: current[key]?.domains ?? [] },
    }));
  }

  function toggleDomain(key: PermissionKey, domain: Domain) {
    setEdits((current) => {
      const edit = current[key] ?? { decision: 'grant' as Decision, domains: [] };
      const domains = edit.domains.includes(domain)
        ? edit.domains.filter((d) => d !== domain)
        : [...edit.domains, domain];
      return { ...current, [key]: { ...edit, domains } };
    });
  }

  /**
   * What this person will be able to do, in a sentence (§9.17).
   *
   * Not memoised: it is a loop over about fifteen permissions, and a hand-rolled
   * memo here is what stopped the compiler optimising the whole component.
   */
  const preview = (() => {
    if (!member) return '';

    const able: string[] = [];

    for (const group of PERMISSION_GROUPS) {
      for (const meta of group.permissions) {
        // Read straight from `edits` rather than through decisionFor, so the
        // memo's dependency on it is one the compiler can actually see.
        const decision = edits[meta.key]?.decision ?? 'inherit';
        const allowed =
          decision === 'grant' || (decision === 'inherit' && defaults.has(meta.key));
        if (!allowed) continue;

        const scope = edits[meta.key]?.domains ?? [];
        able.push(
          decision === 'grant' && meta.scopable && scope.length > 0
            ? `${meta.name.toLowerCase()} in ${scope.map((d) => DOMAIN_LABELS[d]).join(' and ')}`
            : meta.name.toLowerCase(),
        );
      }
    }

    const first = member.name.split(' ')[0];
    if (able.length === 0) return `${first} will not be able to do anything.`;
    return `${first} will be able to: ${able.join(' · ')}.`;
  })();

  function save() {
    if (!member) return;

    // Atomic: one write for the whole person (§9.17).
    setForPerson(member.id, edits);
    toast.show(
      `${dirtyCount} ${dirtyCount === 1 ? 'change' : 'changes'} saved for ${member.name}.`,
      { tone: 'success' },
    );
  }

  const memberList = (
    <div className="perm__list">
      <SearchBar label="Search members" value={query} onChange={setQuery} tone="ink" />

      <ul className="perm__members" role="list">
        {members.map((each) => (
          <li key={each.id}>
            <button
              type="button"
              className={cn('perm__member', each.id === selectedId && 'perm__member--on')}
              aria-current={each.id === selectedId || undefined}
              onClick={() => pick(each.id)}
            >
              <Avatar
                size={32}
                name={each.name}
                initials={each.initials}
                channel={each.domain}
              />
              <span className="perm__member-body">
                <span className="body-sm perm__member-name">{each.name}</span>
                <span className="micro perm__member-title">{each.title}</span>
              </span>
              {/*
                Not the ink stock: this list sits on the ink ground, where an
                ink tag is black on black. The default paper fill reads on both
                the ground and the selected row.
              */}
              <Tag>{roleOf(each).replace('-', ' ')}</Tag>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const editor = member && (
    /*
      The preview and the save bar both pin to the bottom, so while anything is
      dirty the preview has to move up out of the bar's way — §9.17 wants both
      of them visible at once, not one covering the other.
    */
    <div className={cn('perm__editor', dirtyCount > 0 && 'perm__editor--dirty')}>
      {!isDesktop && (
        <div className="perm__back">
          <IconButton
            label="Back to the member list"
            icon={<IconChevronLeft />}
            tone="ink"
            onClick={() => setSelectedId(null)}
          />
          <span className="body-sm perm__back-name">{member.name}</span>
        </div>
      )}

      <Card className="perm__groups">
        {PERMISSION_GROUPS.map((group, index) => (
          <Accordion key={group.id} title={group.label} defaultOpen={index === 0}>
            <ul className="perm__rows" role="list">
              {group.permissions.map((meta) => {
                const decision = decisionFor(meta.key);
                const isDefault = defaults.has(meta.key);
                const scope = edits[meta.key]?.domains ?? [];

                return (
                  <li className="perm__row" key={meta.key}>
                    <div className="perm__row-head">
                      <span className="perm__row-body">
                        <span className="body-sm perm__row-name">{meta.name}</span>
                        {/* The role default, so INHERIT is never ambiguous. */}
                        <span className="micro perm__row-default">
                          {role.replace('-', ' ')} default:{' '}
                          {isDefault ? 'allowed' : 'not allowed'}
                        </span>
                      </span>

                      <SegmentedControl
                        label={`${meta.name} for ${member.name}`}
                        segments={DECISIONS}
                        value={decision}
                        onChange={(value) => setDecision(meta.key, value)}
                        className="perm__control"
                      />
                    </div>

                    {/* §9.17 — scoping appears only on a granted, scopable row. */}
                    {decision === 'grant' && meta.scopable && (
                      <div className="perm__scope">
                        <span className="micro perm__scope-label">
                          {scope.length === 0 ? 'In every domain' : 'Only in'}
                        </span>
                        <div className="perm__scope-chips no-scrollbar">
                          {boards.map((board) => (
                            <Chip
                              key={board.domain}
                              variant="toggle"
                              selected={scope.includes(board.domain)}
                              onClick={() => toggleDomain(meta.key, board.domain)}
                            >
                              {board.name}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Accordion>
        ))}
      </Card>

      {/* §9.17's always-visible live preview. */}
      <Card surface="mint" className="perm__preview" title="What this means">
        <p className="body-sm perm__preview-text">{preview}</p>
      </Card>

      <div className="perm__danger">
        <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
          Reset to role default
        </Button>
      </div>
    </div>
  );

  return (
    <AdminPage screen={SCREEN}>
      {isDesktop ? (
        <div className="perm">
          {memberList}
          {editor}
        </div>
      ) : selectedId ? (
        editor
      ) : (
        memberList
      )}

      {/* §9.17 — the bar appears the moment anything is dirty. */}
      {dirtyCount > 0 && (
        <div className="perm__savebar" role="region" aria-label="Unsaved changes">
          <p className="body-sm perm__savebar-count">
            {dirtyCount} {dirtyCount === 1 ? 'change' : 'changes'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEdits(member ? forPerson(member.id) : {})}
          >
            Discard
          </Button>
          <Button variant="brush" size="sm" onClick={save}>
            Save
          </Button>
        </div>
      )}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset to role default?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (member) clearForPerson(member.id);
                setEdits({});
                setConfirmReset(false);
                toast.show(`${member?.name} is back on the ${role.replace('-', ' ')} defaults.`);
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <p className="body">
          Every grant and revoke set for {member?.name} is removed, and they go
          back to exactly what a {role.replace('-', ' ')} may do. Their work is
          not touched.
        </p>
      </Modal>
    </AdminPage>
  );
}
