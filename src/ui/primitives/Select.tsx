import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Panel } from './Panel';
import { Chip } from './Chip';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional group; options render under a non-selectable header. */
  group?: string;
  /** 18px leading icon, or a domain colour dot via `dot`. */
  icon?: ReactNode;
  dot?: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  /** Single-select value, or the array for multi. */
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  /** Adds a persistent search input at the top of the panel. */
  searchable?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  tone?: 'paper' | 'ink';
  className?: string;
}

/**
 * §7.6 — a headless listbox, deliberately not a native select.
 *
 * Built here rather than on Radix so the mobile bottom-sheet fork (§8 #4) and
 * the sticker-shadow panel are ours to control; the keyboard contract below is
 * the same one Radix would give us.
 */
export function Select({
  label,
  options,
  value,
  onChange,
  multiple = false,
  searchable = false,
  placeholder = 'Select...',
  hint,
  error,
  disabled = false,
  tone = 'paper',
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ buffer: '', at: 0 });
  const id = useId();

  const selected = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  const visible = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, query]);

  const enabled = visible.filter((o) => !o.disabled);

  function commit(option: SelectOption) {
    if (option.disabled) return;
    if (multiple) {
      const next = selected.includes(option.value)
        ? selected.filter((v) => v !== option.value)
        : [...selected, option.value];
      onChange(next);
      return; // multi-select stays open so several can be picked
    }
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(i + 1, enabled.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(enabled.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (enabled[active]) commit(enabled[active]);
        break;
      default: {
        // Type-ahead: printable keys jump to the first matching label. The
        // searchable variant has a real input, so it opts out.
        if (e.key.length !== 1 || searchable) return;
        const now = Date.now();
        typeahead.current.buffer =
          now - typeahead.current.at > 600 ? e.key : typeahead.current.buffer + e.key;
        typeahead.current.at = now;
        const match = enabled.findIndex((o) =>
          o.label.toLowerCase().startsWith(typeahead.current.buffer.toLowerCase()),
        );
        if (match >= 0) setActive(match);
      }
    }
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  // Which options open a new group. Resolved up front rather than tracked
  // during the map, so rendering stays a pure pass over the list.
  const groupHeaders = useMemo(() => {
    const headers = new Map<string, string>();
    let last: string | undefined;
    for (const option of visible) {
      if (option.group && option.group !== last) headers.set(option.value, option.group);
      last = option.group;
    }
    return headers;
  }, [visible]);

  return (
    <div className={cn('select', `select--on-${tone}`, error && 'select--error', className)}>
      <label className="select__label label" htmlFor={id}>{label}</label>

      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="select__trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      >
        <span className="select__value">
          {selectedOptions.length === 0 && (
            <span className="select__placeholder">{placeholder}</span>
          )}

          {multiple && selectedOptions.length > 0 && (
            <>
              {selectedOptions.slice(0, 2).map((o) => (
                <Chip key={o.value} tone={tone}>{o.label}</Chip>
              ))}
              {selectedOptions.length > 2 && (
                <Chip tone={tone}>+{selectedOptions.length - 2}</Chip>
              )}
            </>
          )}

          {!multiple && selectedOptions[0] && (
            <span className="select__single">{selectedOptions[0].label}</span>
          )}
        </span>

        <svg
          className={cn('select__chevron', open && 'select__chevron--open')}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {error ? (
        <p id={`${id}-error`} className="select__error body-sm" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="select__hint body-sm">{hint}</p>
      ) : null}

      <Panel open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} label={label}>
        {searchable && (
          <div className="select__search">
            <input
              className="select__search-input"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder="Search"
              aria-label={`Search ${label}`}
              autoFocus
            />
          </div>
        )}

        <ul
          className="select__list"
          role="listbox"
          aria-multiselectable={multiple || undefined}
          aria-label={label}
        >
          {visible.map((option) => {
            const header = groupHeaders.get(option.value);
            const isSelected = selected.includes(option.value);
            const isActive = enabled[active]?.value === option.value;

            return (
              <li key={option.value}>
                {header && <p className="select__group label">{header}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'select__option',
                    isActive && 'select__option--active',
                    isSelected && 'select__option--selected',
                  )}
                  disabled={option.disabled}
                  onClick={() => commit(option)}
                  onMouseEnter={() => {
                    const i = enabled.findIndex((o) => o.value === option.value);
                    if (i >= 0) setActive(i);
                  }}
                >
                  {option.dot && (
                    <span
                      className="select__dot"
                      style={{ background: option.dot }}
                      aria-hidden="true"
                    />
                  )}
                  {option.icon && <span className="select__icon" aria-hidden="true">{option.icon}</span>}
                  <span className="select__option-label">{option.label}</span>
                  {isSelected && (
                    <svg
                      className="select__check"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 7.5l3.5 3.5L12 3.5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}

          {visible.length === 0 && <li className="select__none body-sm">No matches</li>}
        </ul>
      </Panel>
    </div>
  );
}
