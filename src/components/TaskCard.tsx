import { useNavigate } from 'react-router-dom';
import { Pill } from './Pill';
import { DOMAIN_COLORS, type Task } from '../store/taskStore';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

/** The single card used on My Day, the Board columns, and the approval queue. */
export function TaskCard({ task, draggable, onDragStart, onDragEnd }: TaskCardProps) {
  const navigate = useNavigate();
  const isOverdue = Boolean(task.isOverdue || task.status === 'blocked');
  const color = DOMAIN_COLORS[task.domain];

  const metaText = [
    task.domain.toUpperCase(),
    task.committee ? `COMMITTEE: ${task.committee}` : null,
    task.taskNumber,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`task-card ${isOverdue ? 'overdue' : ''}`}
      style={{ borderTopColor: isOverdue ? 'var(--st-blocked)' : color }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => navigate(`/board/${task.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/board/${task.id}`);
      }}
    >
      <div className="task-meta">{metaText}</div>
      <div className="task-title">{task.title}</div>
      <div className="task-foot">
        <Pill status={task.status} />
        <div className="task-foot-right">
          <span className={`due ${isOverdue ? 'blocked' : ''}`}>{task.dueLabel}</span>
          <div className="tinyavatar">{task.assignee.initials}</div>
        </div>
      </div>
    </div>
  );
}
