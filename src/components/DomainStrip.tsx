import type { Domain } from '../store/taskStore';
import { DOMAIN_COLORS } from '../store/taskStore';
import './DomainStrip.css';

interface DomainStripProps {
  domain: Domain;
  label: string;
  completionRate: number;
  statusText: string;
  overdueCount?: number;
  onClick?: () => void;
}

/** One row of the per-domain completion meter, used on Command Deck and Oversight Deck. */
export function DomainStrip({ domain, label, completionRate, statusText, overdueCount, onClick }: DomainStripProps) {
  const color = DOMAIN_COLORS[domain];
  return (
    <div
      className={`domain-strip ${onClick ? '' : 'static'}`}
      style={{ borderLeftColor: color, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <span className="domain-strip-label">{label}</span>
      <div className="mstrip">
        <div className="mstrip-fill" style={{ width: `${completionRate}%`, background: color }} />
      </div>
      <span className="domain-strip-status" style={overdueCount ? { color: 'var(--st-blocked)' } : undefined}>
        {statusText}
      </span>
    </div>
  );
}
