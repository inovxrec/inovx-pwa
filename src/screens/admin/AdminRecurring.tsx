import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import {
  FREQUENCY_LABELS, RECURRING_RULES, WEEKDAYS, nextOccurrences,
  type Frequency, type RecurringRule,
} from '../../lib/admin';
import { BOARDS } from '../../lib/mockTasks';
import { DOMAIN_LABELS, formatDate, type Domain } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { Select } from '../../ui/primitives/Select';
import { Switch } from '../../ui/primitives/Switch';
import { Tag } from '../../ui/primitives/Tag';
import { Card } from '../../ui/patterns';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'recurring')!;

const BLANK: RecurringRule = {
  id: 'draft',
  title: '',
  frequency: 'weekly',
  weekday: 1,
  monthDay: 1,
  // A real board, not 'core' — core has no board, so the Select had no option
  // matching it and rendered empty.
  domain: BOARDS[0].domain,
  active: true,
};

/** §9.15 — the rule builder, with the live "next five" preview beside it. */
export function AdminRecurring() {
  const toast = useToast();

  const [rules, setRules] = useState<RecurringRule[]>(RECURRING_RULES);
  const [draft, setDraft] = useState<RecurringRule>(BLANK);

  // Recomputed from the draft on every keystroke — the point of the panel is
  // that it answers "what will this actually do" before anything is saved.
  const preview = useMemo(() => nextOccurrences(draft), [draft]);

  function set<K extends keyof RecurringRule>(key: K, value: RecurringRule[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save() {
    const title = draft.title.trim();
    if (!title) return;

    setRules((current) => [...current, { ...draft, id: `rec-${Date.now()}`, title }]);
    setDraft(BLANK);
    toast.show(`"${title}" will raise its first task on ${formatDate(preview[0])}.`, {
      tone: 'success',
    });
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
            {(draft.frequency === 'weekly' || draft.frequency === 'fortnightly') && (
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
              options={BOARDS.map((board) => ({
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

            <Button variant="brush" disabled={!draft.title.trim()} onClick={save}>
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
        <ul className="admin__rules" role="list">
          {rules.map((rule) => (
            <li className="admin__rule" key={rule.id}>
              <span className="admin__rule-body">
                <span className="body-sm admin__rule-title">{rule.title}</span>
                <span className="micro admin__rule-meta">
                  {FREQUENCY_LABELS[rule.frequency]}
                  {rule.frequency === 'weekly' || rule.frequency === 'fortnightly'
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
                onChange={(event) =>
                  setRules((current) =>
                    current.map((r) =>
                      r.id === rule.id ? { ...r, active: event.target.checked } : r,
                    ),
                  )
                }
              />
            </li>
          ))}
        </ul>
      </Card>
    </AdminPage>
  );
}
