import './Pill.css';

export type Status = 'todo' | 'progress' | 'review' | 'done' | 'blocked' | 'proposed' | 'cancelled';

const LABELS: Record<Status, string> = {
  todo: 'To do',
  progress: 'In progress',
  review: 'In review',
  done: 'Done',
  blocked: 'Blocked',
  proposed: 'Proposed',
  cancelled: 'Cancelled',
};

interface PillProps {
  status: Status;
  /** Override the default label text if a screen needs custom copy. */
  label?: string;
}

/** The small colored dot + label used on every TaskCard and status row. */
export function Pill({ status, label }: PillProps) {
  return (
    <span className={`pill st-${status}`}>
      <span className="dot" />
      {label ?? LABELS[status]}
    </span>
  );
}
