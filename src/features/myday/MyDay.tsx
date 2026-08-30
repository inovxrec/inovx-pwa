import { TaskCard } from '../../components/TaskCard';
import { useTasks } from '../../store/taskStore';
import './MyDay.css';

export function MyDay() {
  const { overdueTasks, dueTodayTasks, awaitingReviewTasks, occasions } = useTasks();

  return (
    <div>
      <div className="eyebrow">Member landing</div>
      <h1 className="st">My Day</h1>
      <div className="statusline">
        &gt; {dueTodayTasks.length} DUE TODAY · {overdueTasks.length} OVERDUE · {awaitingReviewTasks.length} AWAITING REVIEW
      </div>

      {overdueTasks.length > 0 && (
        <div className="myday-section">
          <div className="section-label">Overdue</div>
          {overdueTasks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}

      <div className="myday-section">
        <div className="section-label">Due today</div>
        {dueTodayTasks.length > 0 ? (
          dueTodayTasks.map((t) => <TaskCard key={t.id} task={t} />)
        ) : (
          <div className="empty">
            <div className="l1">&gt; ALL CLEAR</div>
            Nothing due today.
          </div>
        )}
      </div>

      <div className="myday-section">
        <div className="section-label">Occasions today &amp; tomorrow</div>
        <div className="myday-occasions">
          {occasions.map((occ) => (
            <div key={occ.id} className="myday-occasion-row">
              {occ.avatarText} {occ.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
