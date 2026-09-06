import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import './Field.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Always required — a placeholder is a hint, never a label (§7.5). */
  label: string;
  /** Renders below the field; replaced by `error` when one is present. */
  hint?: string;
  error?: string;
  /** Which ground the field sits on. */
  tone?: 'paper' | 'ink';
  /** Shows a live counter that turns blocked-red in the last 10%. */
  maxLength?: number;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function Input({
  label,
  hint,
  error,
  tone = 'paper',
  maxLength,
  leading,
  trailing,
  className,
  id,
  value,
  ...rest
}: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  const length = typeof value === 'string' ? value.length : 0;
  const nearLimit = maxLength ? length >= maxLength * 0.9 : false;

  return (
    <div className={cn('field', `field--on-${tone}`, error && 'field--error', className)}>
      <div className="field__top">
        <label className="field__label label" htmlFor={fieldId}>{label}</label>
        {maxLength && (
          <span className={cn('field__count micro', nearLimit && 'field__count--warn')}>
            {length}/{maxLength}
          </span>
        )}
      </div>

      <div className="field__shell">
        {leading && <span className="field__affix" aria-hidden="true">{leading}</span>}
        <input
          id={fieldId}
          className="field__input"
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing && <span className="field__affix" aria-hidden="true">{trailing}</span>}
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="field__error body-sm" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="field__hint body-sm">{hint}</p>
      ) : null}
    </div>
  );
}
