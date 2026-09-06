import { cn } from '../../lib/cn';
import { Avatar, type AvatarProps, type AvatarSize } from './Avatar';
import './Avatar.css';

export interface AvatarStackProps {
  people: Array<Pick<AvatarProps, 'name' | 'initials' | 'src' | 'channel'>>;
  size?: AvatarSize;
  /** Beyond this many, the rest collapse into a +n chip (§7.9). */
  max?: number;
  className?: string;
}

export function AvatarStack({ people, size = 24, max = 3, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <span
      className={cn('avatar-stack', className)}
      style={{ '--avatar-size': `${size}px` } as React.CSSProperties}
    >
      {shown.map((person, i) => (
        <Avatar key={person.name ?? i} size={size} {...person} className="avatar-stack__item" />
      ))}
      {overflow > 0 && (
        <span className="avatar-stack__more micro" aria-label={`${overflow} more`}>
          +{overflow}
        </span>
      )}
    </span>
  );
}
