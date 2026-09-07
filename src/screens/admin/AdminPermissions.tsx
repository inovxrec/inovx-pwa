import { useMemo, useState } from 'react';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { MEMBERS, type Member } from '../../lib/club';
import { BOARDS } from '../../lib/mockTasks';
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

const DECISIONS = [
  { id: 'inherit' as const, label: 'Inherit' },
  { id: 'grant' as const, label: 'Grant' },
  { id: 'revoke' as const, label: 'Revoke' },
];

/**
 * TEMP: the roster carries no role, so one is inferred from the position title.
 * The real member record has it, and this goes when that lands.
 */
function roleOf(member: Member): Role {
  if (member.title === 'President') return 'super-admin';
  if (member.title.endsWith('lead')) return 'admin';
  return 'member';
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

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    isDesktop ? MEMBERS[0].id : null,
  );
  const [edits, setEdits] = useState<PermissionEdits>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const members = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return MEMBERS;
    return MEMBERS.filter((m) => `${m.name} ${m.title}`.toLowerCase().includes(needle));
  }, [query]);

  const member = MEMBERS.find((m) => m.id === selectedId);
  const role = member ? roleOf(member) : 'member';
  const defaults = useMemo(() => new Set(ROLE_DEFAULTS[role]), [role]);

  const dirtyCount = Object.values(edits).filter(
    (edit) => edit && edit.decision !== 'inherit',
  ).length;

  function pick(id: string) {
    setSelectedId(id);
    // Switching people must not carry the previous person's unsaved edits.
    setEdits({});
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

  /** What this person will be able to do, in a sentence (§9.17). */
  const preview = useMemo(() => {
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
  }, [member, defaults, edits]);

  function save() {
    setEdits({});
    toast.show(
      `${dirtyCount} ${dirtyCount === 1 ? 'change' : 'changes'} saved for ${member?.name}.`,
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
              <Tag ink={roleOf(each) !== 'member'}>{roleOf(each).replace('-', ' ')}</Tag>
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
                          {BOARDS.map((board) => (
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
          <Button variant="ghost" size="sm" onClick={() => setEdits({})}>
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
