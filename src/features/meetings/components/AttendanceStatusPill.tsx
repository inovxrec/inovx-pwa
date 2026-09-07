import type { AttendanceStatus } from '../types';

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; dotColor: string; bg: string; textColor: string }
> = {
  present: {
    label: 'Present',
    dotColor: 'var(--st-done)',
    bg: 'rgba(87, 240, 168, 0.1)',
    textColor: 'var(--st-done)',
  },
  absent: {
    label: 'Absent',
    dotColor: 'var(--st-blocked)',
    bg: 'rgba(255, 87, 69, 0.1)',
    textColor: 'var(--st-blocked)',
  },
  excused: {
    label: 'Excused',
    dotColor: 'var(--st-proposed)',
    bg: 'rgba(159, 168, 255, 0.1)',
    textColor: 'var(--st-proposed)',
  },
};

export function AttendanceStatusPill({ status }: { status: AttendanceStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.present;

  return (
    <span
      className="att-status-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '2px 8px',
        backgroundColor: cfg.bg,
        color: cfg.textColor,
        border: `1px solid ${cfg.dotColor}44`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: cfg.dotColor,
          boxShadow: `0 0 5px ${cfg.dotColor}`,
        }}
      />
      {cfg.label}
    </span>
  );
}
