import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import './Control.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  indeterminate?: boolean;
  tone?: 'paper' | 'ink';
  /** Hides the label visually but keeps it for screen readers (§11). */
  labelHidden?: boolean;
}

/**
 * §7.8 — 20px square with a 6px radius. The visual is 20px but the hit area is
 * 44px and the whole label is clickable.
 */
export function Checkbox({
  label,
  indeterminate = false,
  tone = 'paper',
  labelHidden = false,
  className,
  id,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <label className={cn('control', `control--on-${tone}`, className)} htmlFor={fieldId}>
      <input
        id={fieldId}
        type="checkbox"
        className="control__input"
        aria-checked={indeterminate ? 'mixed' : undefined}
        {...rest}
      />
      <span className={cn('control__box', indeterminate && 'control__box--mixed')} aria-hidden="true">
        {indeterminate ? (
          <span className="control__bar" />
        ) : (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path className="control__tick" d="M5 10.5l3.5 3.5L15 6.5" />
          </svg>
        )}
      </span>
      <span className={cn('control__label body', labelHidden && 'sr-only')}>{label}</span>
    </label>
  );
}
