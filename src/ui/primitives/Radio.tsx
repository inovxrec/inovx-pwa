import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import './Control.css';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  tone?: 'paper' | 'ink';
}

/** §7.8 — 20px circle, 2px border, 10px centre dot when checked. */
export function Radio({ label, tone = 'paper', className, id, ...rest }: RadioProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <label className={cn('control', `control--on-${tone}`, className)} htmlFor={fieldId}>
      <input id={fieldId} type="radio" className="control__input" {...rest} />
      <span className="control__radio" aria-hidden="true">
        <span className="control__dot" />
      </span>
      <span className="control__label body">{label}</span>
    </label>
  );
}
