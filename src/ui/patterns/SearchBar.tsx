import { useEffect, useId, useRef } from 'react';
import { cn } from '../../lib/cn';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { IconClose, IconSearch } from '../icons';
import './SearchBar.css';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** The visible label, and the placeholder when there is room for one. */
  label: string;
  placeholder?: string;
  /** Focuses on ⌘K / Ctrl+K. Desktop only — there is no keyboard to catch. */
  shortcut?: boolean;
  tone?: 'paper' | 'ink';
  className?: string;
}

/** §7.19 — a pill input with an 18px leading icon, a clear ✕, and ⌘K. */
export function SearchBar({
  value, onChange, label, placeholder, shortcut = true, tone = 'ink', className,
}: SearchBarProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!shortcut || !isDesktop) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcut, isDesktop]);

  return (
    <div className={cn('search', `search--on-${tone}`, className)}>
      <label className="sr-only" htmlFor={id}>{label}</label>

      <span className="search__icon" aria-hidden="true"><IconSearch /></span>

      <input
        id={id}
        ref={inputRef}
        type="search"
        className="search__input"
        value={value}
        placeholder={placeholder ?? label}
        onChange={(e) => onChange(e.target.value)}
      />

      {value ? (
        <button
          type="button"
          className="search__clear"
          aria-label="Clear search"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
        >
          <IconClose />
        </button>
      ) : (
        shortcut && isDesktop && <kbd className="search__kbd micro">⌘K</kbd>
      )}
    </div>
  );
}
