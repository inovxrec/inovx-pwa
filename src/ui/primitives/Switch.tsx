import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import './Control.css';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  tone?: 'paper' | 'ink';
  /** Hides the label visually but keeps it for screen readers. */
  labelHidden?: boolean;
}

/** §7.8 — 44×26 track; the knob slides over --t-base and the track fills flame. */
export function Switch({
  label,
  tone = 'paper',
  labelHidden = false,
  className,
  id,
  ...rest
}: SwitchProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <label className={cn('control', 'control--switch', `control--on-${tone}`, className)} htmlFor={fieldId}>
      <input id={fieldId} type="checkbox" role="switch" className="control__input" {...rest} />
      <span className="control__track" aria-hidden="true">
        <span className="control__knob" />
      </span>
      <span className={cn('control__label body', labelHidden && 'sr-only')}>{label}</span>
    </label>
  );
}
