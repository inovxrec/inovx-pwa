import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '../../components/Panel';
import { Pill } from '../../components/Pill';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useTasks } from '../../store/taskStore';
import { DOMAIN_LABELS } from '../../store/taskStore';
import './TaskDetail.css';

export function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getTask, submitForReview, deleteTask, toggleChecklistItem, addChecklistItem, tasksLoading, tasksError } =
    useTasks();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  const task = taskId ? getTask(taskId) : undefined;

  if (!task) {
    if (tasksLoading) {
      return (
        <div className="empty">
          <div className="l1">&gt; LOADING TASK…</div>
        </div>
      );
    }
    return (
      <div className="empty">
        <div className="l1">&gt; {tasksError ? 'LIVE TASKS FAILED TO LOAD' : 'TASK NOT FOUND'}</div>
        {tasksError && <p>{tasksError}</p>}
        <Button variant="ghost" onClick={() => navigate('/board')}>Back to board</Button>
      </div>
    );
  }

  const completed = task.checklist.filter((c) => c.completed).length;
  const total = task.checklist.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="task-detail">
      <button className="task-detail-back" onClick={() => navigate('/board')}>&larr; Back to board</button>

      <div className="task-detail-header">
        <span className="task-detail-number">{task.taskNumber}</span>
        <h1 className="st" style={{ margin: '4px 0 10px' }}>{task.title}</h1>
        <div className="task-detail-pills">
          <Pill status={task.status} />
          <span className="tag-pill">{DOMAIN_LABELS[task.domain]}</span>
          <span className="tag-pill">PRIORITY: {task.priority.toUpperCase()}</span>
        </div>
      </div>

      {task.isBlocked && (
        <Panel className="task-detail-blocked">
          <strong>BLOCKED</strong> — {task.blockedReason || 'This task is flagged as blocked.'}
        </Panel>
      )}

      <Panel className="task-detail-section">
        <div className="eyebrow">Description</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{task.description || 'No description provided.'}</p>
      </Panel>

      <Panel className="task-detail-section">
        <div className="eyebrow">Metadata</div>
        <div className="task-detail-grid">
          <div>
            <span className="task-detail-grid-label">Assignee</span>
            <div className="task-detail-assignee">
              <Avatar initials={task.assignee.initials} size="sm" />
              <span>{task.assignee.name}</span>
            </div>
          </div>
          <div>
            <span className="task-detail-grid-label">Due</span>
            <div>{task.dueLabel}</div>
          </div>
          <div>
            <span className="task-detail-grid-label">Domain</span>
            <div>{DOMAIN_LABELS[task.domain]}</div>
          </div>
          <div>
            <span className="task-detail-grid-label">Created</span>
            <div>{task.createdAt}</div>
          </div>
        </div>
      </Panel>

      <Panel className="task-detail-section">
        <div className="task-detail-checklist-header">
          <span className="eyebrow" style={{ marginBottom: 0 }}>Checklist — {completed} / {total}</span>
          <span className="task-detail-percentage">{percentage}%</span>
        </div>
        <div className="task-detail-progress-bar">
          <div className="task-detail-progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        <div className="task-detail-checklist">
          {task.checklist.map((item) => (
            <label key={item.id} className={`task-detail-check-row ${item.completed ? 'done' : ''}`}>
              <input type="checkbox" checked={item.completed} onChange={() => toggleChecklistItem(task.id, item.id)} />
              <span>{item.text}</span>
            </label>
          ))}
          {total === 0 && <p className="task-detail-empty-checklist">No checklist items yet.</p>}
        </div>
        <form
          className="task-detail-add-item"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newItemText.trim()) return;
            addChecklistItem(task.id, newItemText);
            setNewItemText('');
          }}
        >
          <input
            type="text"
            placeholder="Add checklist item…"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
          />
          <Button variant="secondary" type="submit">Add</Button>
        </form>
      </Panel>

      {task.tags && task.tags.length > 0 && (
        <div className="task-detail-tags">
          {task.tags.map((tag) => (
            <span key={tag} className="tag-pill">#{tag}</span>
          ))}
        </div>
      )}

      <div className="task-detail-actions">
        {task.status === 'progress' && (
          <Button
            variant="primary"
            onClick={() => {
              submitForReview(task.id);
              toast(`TASK ${task.taskNumber} SUBMITTED FOR REVIEW`);
            }}
          >
            Submit for review
          </Button>
        )}
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete task</Button>
      </div>

      <Modal
        open={confirmDelete}
        title="Delete this task?"
        body={
          <>
            <p style={{ marginTop: 0 }}>
              <strong>{task.taskNumber}</strong> — {task.title}
            </p>
            <p>This can&rsquo;t be undone. All checklist history will be removed.</p>
          </>
        }
        confirmLabel="Delete task"
        onConfirm={() => {
          deleteTask(task.id);
          toast(`TASK ${task.taskNumber} DELETED`);
          navigate('/board');
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
