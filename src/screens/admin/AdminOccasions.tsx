import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { describeError } from '../../lib/supabase';
import { confirmOccasionDate, fetchOccasions, updateOccasionOutputs } from '../../lib/db/queries';
import { useBoards, useClub } from '../../store/ClubProvider';
import {
  OCCASION_TYPE_LABELS, STRATEGY_LABELS,
  type AssignmentStrategy, type OccasionRule, type OccasionType,
} from '../../lib/admin';
import { DOMAIN_LABELS, formatDate, type Domain } from '../../lib/tasks';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { DatePicker } from '../../ui/primitives/DatePicker';
import { Select } from '../../ui/primitives/Select';
import { Tag } from '../../ui/primitives/Tag';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import { Accordion, Card, EmptyState } from '../../ui/patterns';
import { StickerCalendar } from '../../ui/stickers';
import { ADMIN_SCREENS, AdminPage } from './AdminFrame';
import './Admin.css';

const SCREEN = ADMIN_SCREENS.find((s) => s.id === 'occasions')!;

const TYPES: Array<OccasionType | 'all'> = ['all', 'birthday', 'anniversary', 'lunar', 'festival'];

/** §9.15 — the occasion list, its per-occasion outputs, and the lunar queue. */
export function AdminOccasions() {
  const toast = useToast();
  const { tenureId, domains } = useClub();
  const boards = useBoards();

  const [rules, setRules] = useState<OccasionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState<OccasionType | 'all'>('all');
  /** The date being entered for each lunar occasion still awaiting one. */
  const [dates, setDates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tenureId) return;
    let cancelled = false;

    setLoading(true);
    setError('');
    fetchOccasions(tenureId, domains)
      .then((rows) => !cancelled && setRules(rows))
      .catch((caught) => !cancelled && setError(describeError(caught)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [tenureId, domains]);

  const pending = rules.filter((rule) => rule.needsDate);

  const visible = useMemo(
    () => (type === 'all' ? rules : rules.filter((rule) => rule.type === type)),
    [rules, type],
  );

  async function confirmDate(rule: OccasionRule) {
    const value = dates[rule.id];
    if (!value) return;

    try {
      await confirmOccasionDate(rule.id, value);
      setRules((current) =>
        current.map((r) =>
          r.id === rule.id ? { ...r, date: value.slice(5), needsDate: false } : r,
        ),
      );
      toast.show(`${rule.name} set to ${formatDate(value)} this year.`, { tone: 'success' });
    } catch (caught) {
      toast.show(describeError(caught), { tone: 'error' });
    }
  }

  async function update(rule: OccasionRule, patch: Partial<OccasionRule>) {
    setRules((current) => current.map((r) => (r.id === rule.id ? { ...r, ...patch } : r)));

    try {
      await updateOccasionOutputs(rule.id, {
        ...(patch.outputDomain !== undefined && {
          outputDomainId:
            domains.find((domain) => domain.slug === patch.outputDomain)?.id ?? null,
        }),
        ...(patch.leadDays !== undefined && { leadDays: patch.leadDays }),
        ...(patch.strategy !== undefined && { strategy: patch.strategy }),
      });
    } catch (caught) {
      // Put the control back rather than leaving it showing a setting that was
      // never saved — this decides who ends up doing the work.
      setRules((current) => current.map((r) => (r.id === rule.id ? rule : r)));
      toast.show(describeError(caught), { tone: 'error' });
    }
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
                  onClick={() => void confirmDate(rule)}
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

      {loading && (
        <Card>
          <SkeletonTaskCard />
        </Card>
      )}

      {!loading && error && (
        <Card>
          <EmptyState
            sticker={<StickerCalendar size="empty" />}
            title="Could not read the occasions"
            line={error}
          />
        </Card>
      )}

      {!loading && !error && (
        <Card className={visible.length === 0 ? undefined : 'admin__accordions'}>
          {visible.length === 0 && (
            <EmptyState
              sticker={<StickerCalendar size="empty" />}
              title={rules.length === 0 ? 'No occasions yet' : 'No occasions of that kind'}
              line={
                rules.length === 0
                  ? 'nothing on the calendar generates work on its own'
                  : 'try another type'
              }
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
                {/*
                  Core has no board, so an occasion that has never been pointed
                  at a domain would otherwise select nothing and read as though
                  Design were already picked. It says "not set" until it is.
                */}
                <Select
                  label="Output domain"
                  value={rule.outputDomain}
                  options={[
                    ...(boards.some((board) => board.domain === rule.outputDomain)
                      ? []
                      : [{ value: rule.outputDomain, label: 'Not set' }]),
                    ...boards.map((board) => ({
                      value: board.domain,
                      label: board.name,
                      dot: `var(--dom-${board.domain})`,
                    })),
                  ]}
                  onChange={(value) => void update(rule, { outputDomain: value as Domain })}
                />

                <Select
                  label="Raise the task"
                  value={String(rule.leadDays)}
                  options={[3, 5, 7, 10, 14].map((days) => ({
                    value: String(days),
                    label: `${days} days before`,
                  }))}
                  onChange={(value) => void update(rule, { leadDays: Number(value) })}
                />

                <Select
                  label="Assignment"
                  value={rule.strategy}
                  options={Object.entries(STRATEGY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(value) =>
                    void update(rule, { strategy: value as AssignmentStrategy })
                  }
                />
              </div>
            </Accordion>
          ))}
        </Card>
      )}
    </AdminPage>
  );
}
