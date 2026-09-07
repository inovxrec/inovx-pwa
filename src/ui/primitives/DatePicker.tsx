import { useId, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Panel } from './Panel';
import './DatePicker.css';

export interface DatePickerProps {
  label: string;
  /** Hides the label visually but keeps it for screen readers (§11). */
  labelHidden?: boolean;
  /** ISO yyyy-mm-dd, or null for unset. */
  value: string | null;
  onChange: (value: string) => void;
  /** Range mode fills the days between with --flame-soft. */
  rangeEnd?: string | null;
  onRangeEndChange?: (value: string) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  tone?: 'paper' | 'ink';
  className?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(d: Date): string {
  // Local date, not UTC — a due date is a calendar day, not an instant.
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseISO(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Monday-first offset for the 1st of the month. */
function leadingBlanks(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

/**
 * §7.19 — today is outlined 2px --ink, the selected day is filled --ink, and a
 * range fills --flame-soft. On mobile it opens as a sheet like every other
 * Panel consumer.
 */
export function DatePicker({
  label,
  labelHidden = false,
  value,
  onChange,
  rangeEnd = null,
  onRangeEndChange,
  hint,
  error,
  disabled = false,
  tone = 'paper',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [cursor, setCursor] = useState(() => selected ?? new Date());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayISO = toISO(new Date());

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
  }, [year, month]);

  function pick(day: Date) {
    const iso = toISO(day);
    // In range mode the second click sets the end, unless it precedes the start.
    if (onRangeEndChange && value && !rangeEnd && iso >= value) {
      onRangeEndChange(iso);
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    onChange(iso);
    if (!onRangeEndChange) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function inRange(iso: string): boolean {
    if (!value || !rangeEnd) return false;
    return iso > value && iso < rangeEnd;
  }

  const display = selected
    ? selected.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pick a date';

  return (
    <div className={cn('datepicker', `datepicker--on-${tone}`, error && 'datepicker--error', className)}>
      <label className={cn('datepicker__label label', labelHidden && 'sr-only')} htmlFor={id}>
        {label}
      </label>

      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="datepicker__trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      >
        <span className={cn('datepicker__value', !selected && 'datepicker__value--empty')}>
          {display}
        </span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2" y="3.5" width="12" height="11" rx="2" />
          <path d="M2 7h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
        </svg>
      </button>

      {error ? (
        <p id={`${id}-error`} className="datepicker__error body-sm" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="datepicker__hint body-sm">{hint}</p>
      ) : null}

      <Panel open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} label={label}>
        <div className="cal">
          <div className="cal__head">
            <button
              type="button"
              className="cal__nav"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>

            <p className="cal__month display-4" aria-live="polite">{MONTHS[month]} {year}</p>

            <button
              type="button"
              className="cal__nav"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </div>

          <div className="cal__grid" role="grid">
            {WEEKDAYS.map((d) => (
              <span key={d} className="cal__weekday micro" role="columnheader">{d}</span>
            ))}

            {Array.from({ length: leadingBlanks(year, month) }, (_, i) => (
              <span key={`blank-${i}`} className="cal__blank" />
            ))}

            {days.map((day) => {
              const iso = toISO(day);
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  className={cn(
                    'cal__day',
                    'tnum',
                    iso === todayISO && 'cal__day--today',
                    (iso === value || iso === rangeEnd) && 'cal__day--selected',
                    inRange(iso) && 'cal__day--in-range',
                  )}
                  aria-current={iso === todayISO ? 'date' : undefined}
                  aria-selected={iso === value || iso === rangeEnd}
                  onClick={() => pick(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}
