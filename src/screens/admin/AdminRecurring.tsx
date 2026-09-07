import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { describeError } from '../../lib/supabase';
import {
  cronFor, domainIdBySlug, fetchRecurringRules, insertRecurringRule,
  scheduleFromCron, setRecurringRuleActive,
} from '../../lib/db/queries';
import { useBoards, useClub } from '../../store/ClubProvider';
import {
  FREQUENCY_LABELS, WEEKDAYS, nextOccurrences,
  type Frequency, type RecurringRule,
} from '../../lib/admin';
import { DOMAIN_LABELS, formatDate, type Domain } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { Select } from '../../ui/primitives/Select';
import { Switch } from '../../ui/primitives/Switch';
import { Tag } from '../../ui/primitives/Tag';
import { Card, EmptyState } from '../../ui/patterns';
import { StickerCalendar } from '../../ui/stickers';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'recurring')!;

const BLANK: RecurringRule = {
  id: 'draft',
  title: '',
  frequency: 'weekly',
  weekday: 1,
  monthDay: 1,
  domain: 'design',
  active: true,
};

/** §9.15 — the rule builder, with the live "next five" preview beside it. */
export function AdminRecurring() {
  const toast = useToast();
  const { tenureId, domains } = useClub();
  const boards = useBoards();

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<RecurringRule>(BLANK);

  /*
    A real board, not 'core' — core has no board, so the Select would have no
    option matching it and render empty. The boards arrive a moment after the
    first render, so the draft's domain is corrected here rather than in an
    effect that would re-render for it.
  */
  const blank: RecurringRule = { ...BLANK, domain: boards[0]?.domain ?? BLANK.domain };
  const onABoard = boards.some((board) => board.domain === draft.domain);
  if (boards.length > 0 && !onABoard) setDraft((current) => ({ ...current, domain: blank.domain }));

  useEffect(() => {
    if (!tenureId) return;
    let cancelled = false;

    const slugById = new Map(domains.map((domain) => [domain.id, domain.slug as Domain]));

    setLoading(true);
    fetchRecurringRules(tenureId)
      .then((rows) => {
        if (cancelled) return;
        setRules(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            frequency: row.frequency,
            domain: slugById.get(row.context_id) ?? 'core',
            active: row.is_active,
            ...scheduleFromCron(row.cron_expression),
          })),
        );
      })
      .catch((caught) => !cancelled && setError(describeError(caught)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [tenureId, domains]);

  // Recomputed from the draft on every keystroke — the point of the panel is
  // that it answers "what will this actually do" before anything is saved.
  const preview = useMemo(() => nextOccurrences(draft), [draft]);

  function set<K extends keyof RecurringRule>(key: K, value: RecurringRule[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const title = draft.title.trim();
    if (!title || !tenureId) return;

    const contextId = domainIdBySlug(domains, draft.domain);
    if (!contextId) {
      toast.show('That domain is not on this tenure.', { tone: 'error' });
      return;
    }

    try {
      const row = await insertRecurringRule({
        tenureId,
        title,
        frequency: draft.frequency,
        cron: cronFor(draft.frequency, draft.weekday, draft.monthDay),
        contextId,
        active: draft.active,
      });

      setRules((current) => [...current, { ...draft, id: row.id, title }]);
      setDraft(blank);
      toast.show(`"${title}" will raise its first task on ${formatDate(preview[0])}.`, {
        tone: 'success',
      });
    } catch (caught) {
      toast.show(describeError(caught), { tone: 'error' });
    }
  }

  async function toggle(rule: RecurringRule, active: boolean) {
    setRules((current) =>
      current.map((r) => (r.id === rule.id ? { ...r, active } : r)),
    );

    try {
      await setRecurringRuleActive(rule.id, active);
    } catch (caught) {
      // Put the switch back rather than leaving it saying something untrue.
      setRules((current) =>
        current.map((r) => (r.id === rule.id ? { ...r, active: !active } : r)),
      );
      toast.show(describeError(caught), { tone: 'error' });
    }
  }

  return (
    <AdminPage screen={SCREEN}>
      <div className="admin__split">
        <Card title="New rule" className="admin__split-main">
          <div className="admin__form">
            <Input
              label="Task title"
              placeholder="Weekly recap post"
              value={draft.title}
              onChange={(event) => set('title', event.target.value)}
            />

            <Select
              label="How often"
              value={draft.frequency}
              options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              onChange={(value) => set('frequency', value as Frequency)}
            />

            {/* Only the control the chosen frequency actually uses is rendered. */}
            {(draft.frequency === 'weekly' || draft.frequency === 'biweekly') && (
              <Select
                label="On which day"
                value={String(draft.weekday)}
                options={WEEKDAYS.map((day, index) => ({ value: String(index), label: day }))}
                onChange={(value) => set('weekday', Number(value))}
              />
            )}

            {draft.frequency === 'monthly' && (
              <Select
                label="On which date"
                value={String(draft.monthDay)}
                options={Array.from({ length: 28 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Day ${i + 1}`,
                }))}
                onChange={(value) => set('monthDay', Number(value))}
              />
            )}

            <Select
              label="Domain"
              value={draft.domain}
              options={boards.map((board) => ({
                value: board.domain,
                label: board.name,
                dot: `var(--dom-${board.domain})`,
              }))}
              onChange={(value) => set('domain', value as Domain)}
            />

            <Switch
              label="Active"
              checked={draft.active}
              onChange={(event) => set('active', event.target.checked)}
            />

            <Button variant="brush" disabled={!draft.title.trim()} onClick={() => void save()}>
              Create rule
            </Button>
          </div>
        </Card>

        {/* §9.15's live preview — it updates as the frequency changes. */}
        <Card surface="mint" title="Next five" className="admin__split-side">
          <ol className="admin__preview" role="list">
            {preview.map((date, index) => (
              <li className="admin__preview-row" key={date}>
                <span className="micro track-no">{String(index + 1).padStart(2, '0')}</span>
                <span className="body-sm">{formatDate(date)}</span>
              </li>
            ))}
          </ol>
          <p className="body-sm admin__note">
            {draft.title.trim()
              ? `"${draft.title.trim()}" would be raised on these dates.`
              : 'Give the rule a title and it will raise a task on each of these.'}
          </p>
        </Card>
      </div>

      <Card title="Existing rules">
        {loading && <SkeletonTaskCard />}

        {!loading && error && (
          <EmptyState
            sticker={<StickerCalendar size="empty" />}
            title="Could not read the rules"
            line={error}
          />
        )}

        {!loading && !error && rules.length === 0 && (
          <EmptyState
            sticker={<StickerCalendar size="empty" />}
            title="No rules yet"
            line="nothing is raised on a schedule — build one above"
          />
        )}

        <ul className="admin__rules" role="list">
          {rules.map((rule) => (
            <li className="admin__rule" key={rule.id}>
              <span className="admin__rule-body">
                <span className="body-sm admin__rule-title">{rule.title}</span>
                <span className="micro admin__rule-meta">
                  {FREQUENCY_LABELS[rule.frequency]}
                  {rule.frequency === 'weekly' || rule.frequency === 'biweekly'
                    ? ` · ${WEEKDAYS[rule.weekday]}`
                    : rule.frequency === 'monthly'
                      ? ` · day ${rule.monthDay}`
                      : ''}
                </span>
              </span>

              <Tag channel={rule.domain}>{DOMAIN_LABELS[rule.domain]}</Tag>

              <Switch
                label={`${rule.title} active`}
                labelHidden
                checked={rule.active}
                onChange={(event) => void toggle(rule, event.target.checked)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </AdminPage>
  );
}
