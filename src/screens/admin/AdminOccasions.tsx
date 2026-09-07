import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import {
  OCCASION_RULES, OCCASION_TYPE_LABELS, STRATEGY_LABELS,
  type OccasionRule, type OccasionType,
} from '../../lib/admin';
import { BOARDS } from '../../lib/mockTasks';
import { DOMAIN_LABELS, formatDate, type Domain } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { DatePicker } from '../../ui/primitives/DatePicker';
import { Select } from '../../ui/primitives/Select';
import { Tag } from '../../ui/primitives/Tag';
import { Accordion, Card, EmptyState } from '../../ui/patterns';
import { StickerCalendar } from '../../ui/stickers';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'occasions')!;

const TYPES: Array<OccasionType | 'all'> = ['all', 'birthday', 'anniversary', 'lunar', 'festival'];

/** §9.15 — the occasion list, its per-occasion outputs, and the lunar queue. */
export function AdminOccasions() {
  const toast = useToast();

  const [rules, setRules] = useState<OccasionRule[]>(OCCASION_RULES);
  const [type, setType] = useState<OccasionType | 'all'>('all');
  /** The date being entered for each lunar occasion still awaiting one. */
  const [dates, setDates] = useState<Record<string, string>>({});

  const pending = rules.filter((rule) => rule.needsDate);

  const visible = useMemo(
    () => (type === 'all' ? rules : rules.filter((rule) => rule.type === type)),
    [rules, type],
  );

  function confirmDate(rule: OccasionRule) {
    const value = dates[rule.id];
    if (!value) return;

    setRules((current) =>
      current.map((r) =>
        r.id === rule.id ? { ...r, date: value.slice(5), needsDate: false } : r,
      ),
    );
    toast.show(`${rule.name} set to ${formatDate(value)} this year.`, { tone: 'success' });
  }

  function update(id: string, patch: Partial<OccasionRule>) {
    setRules((current) => current.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <AdminPage screen={SCREEN}>
      {/*
        §9.15's lunar confirmation queue — a mint banner at the top, present
        only while something actually needs this year's date.
      */}
      {pending.length > 0 && (
        <Card
          surface="mint"
          title="Dates needed this year"
          aside={<Tag state="review">{pending.length}</Tag>}
        >
          <p className="body-sm">
            These follow a lunar calendar, so their date moves each year and
            cannot be worked out from last year's. Nothing is generated for them
            until a date is set.
          </p>

          <ul className="admin__queue" role="list">
            {pending.map((rule) => (
              <li className="admin__queue-row" key={rule.id}>
                <span className="body-sm admin__queue-name">{rule.name}</span>
                <DatePicker
                  label={`Date for ${rule.name}`}
                  labelHidden
                  value={dates[rule.id] ?? ''}
                  onChange={(value) =>
                    setDates((current) => ({ ...current, [rule.id]: value }))
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!dates[rule.id]}
                  onClick={() => confirmDate(rule)}
                >
                  Confirm
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="admin__filters no-scrollbar" role="group" aria-label="Filter by type">
        {TYPES.map((option) => (
          <Chip
            key={option}
            variant="toggle"
            tone="ink"
            selected={type === option}
            onClick={() => setType(option)}
          >
            {option === 'all' ? 'All' : OCCASION_TYPE_LABELS[option]}
          </Chip>
        ))}
      </div>

      <Card className={visible.length === 0 ? undefined : 'admin__accordions'}>
        {visible.length === 0 && (
          <EmptyState
            sticker={<StickerCalendar size="empty" />}
            title="No occasions of that kind"
            line="try another type, or add one"
          />
        )}

        {visible.map((rule) => (
          <Accordion
            key={rule.id}
            title={rule.name}
            aside={
              <span className="admin__occasion-meta micro">
                {rule.date ? rule.date.replace('-', '/') : 'no date yet'} ·{' '}
                {DOMAIN_LABELS[rule.outputDomain]}
              </span>
            }
          >
            {/* §9.15's outputs sub-panel: which domain, lead time, strategy. */}
            <div className="admin__outputs">
              <Select
                label="Output domain"
                value={rule.outputDomain}
                options={BOARDS.map((board) => ({
                  value: board.domain,
                  label: board.name,
                  dot: `var(--dom-${board.domain})`,
                }))}
                onChange={(value) => update(rule.id, { outputDomain: value as Domain })}
              />

              <Select
                label="Raise the task"
                value={String(rule.leadDays)}
                options={[3, 5, 7, 10, 14].map((days) => ({
                  value: String(days),
                  label: `${days} days before`,
                }))}
                onChange={(value) => update(rule.id, { leadDays: Number(value) })}
              />

              <Select
                label="Assignment"
                value={rule.strategy}
                options={Object.entries(STRATEGY_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(value) =>
                  update(rule.id, { strategy: value as OccasionRule['strategy'] })
                }
              />
            </div>
          </Accordion>
        ))}
      </Card>
    </AdminPage>
  );
}
