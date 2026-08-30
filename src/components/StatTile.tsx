import './StatTile.css';

interface StatTileProps {
  value: string | number;
  label: string;
  /** Marks the tile with the blocked/danger accent — used for overdue counts. */
  hot?: boolean;
}

/** KPI tile used on Command Deck. One glance = one number + one label. */
export function StatTile({ value, label, hot }: StatTileProps) {
  return (
    <div className={`stat-tile ${hot ? 'hot' : ''}`}>
      <div className="stat-num" style={hot ? { color: 'var(--st-blocked)' } : undefined}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
