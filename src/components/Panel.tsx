import type { HTMLAttributes } from 'react';
import './Panel.css';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the accent L-corner brackets — use on hero/focal panels only, not every card. */
  bracket?: boolean;
  /** Bracket color, defaults to --chan. Login uses --chan-core, delete modal uses --st-blocked. */
  bracketColor?: string;
}

export function Panel({ bracket, bracketColor, className = '', style, children, ...rest }: PanelProps) {
  return (
    <div
      className={`panel ${bracket ? 'panel-bracket' : ''} ${className}`.trim()}
      style={{ ...(bracketColor ? ({ '--bracket-color': bracketColor } as React.CSSProperties) : {}), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
