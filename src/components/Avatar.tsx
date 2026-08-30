import './Avatar.css';

interface AvatarProps {
  /** Initials, e.g. "RS" — the design has no photo avatars, only initials. */
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ initials, size = 'md' }: AvatarProps) {
  return <div className={`avatar avatar-${size}`}>{initials}</div>;
}
