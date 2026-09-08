import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';
import './IconButton.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Required — an icon-only control always names itself (§11). */
  label: string;
  icon: ReactNode;
  /** Which ground it sits on; decides the border colour. */
  tone?: 'paper' | 'ink';
  /** React 19 passes ref as an ordinary prop — Menu anchors its panel to it. */
  ref?: Ref<HTMLButtonElement>;
  children?: never;
}

/**
 * The reference's search / menu button (§7.1): a 40px circle, 1.5px border,
 * transparent fill, 18px icon.
 */
export function IconButton({
  label,
  icon,
  tone = 'paper',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn('icon-btn', `icon-btn--${tone}`, className)}
      aria-label={label}
      {...rest}
    >
      <span className="icon-btn__glyph" aria-hidden="true">{icon}</span>
    </button>
  );
}
