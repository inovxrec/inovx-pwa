import { useId, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import './Field.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  tone?: 'paper' | 'ink';
  className?: string;
}

const MIN_ROWS = 3;
const MAX_ROWS = 10;

export function Textarea({
  label,
  hint,
  error,
  tone = 'paper',
  maxLength,
  className,
  id,
  value,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const ref = useRef<HTMLTextAreaElement>(null);
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  const length = typeof value === 'string' ? value.length : 0;
  const nearLimit = maxLength ? length >= maxLength * 0.9 : false;

  // Grows from 3 rows to 10, then scrolls (§7.5).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const line = parseFloat(getComputedStyle(el).lineHeight) || 22;
    const padding = 24;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, line * MAX_ROWS + padding)}px`;
  }, [value]);

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

      <div className="field__shell field__shell--area">
        <textarea
          id={fieldId}
          ref={ref}
          rows={MIN_ROWS}
          className="field__input field__input--area"
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="field__error body-sm" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="field__hint body-sm">{hint}</p>
      ) : null}
    </div>
  );
}
