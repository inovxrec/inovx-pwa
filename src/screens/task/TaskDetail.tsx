import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTasks } from '../../store/taskStore';
import { useAuth } from '../../store/authStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useToast } from '../../hooks/useToast';
import { usePermissionCheck } from '../../hooks/usePermission';
import { TASK_PARAM, useCloseTask } from '../../hooks/useOpenTask';
import { PERSON_BY_EMAIL } from '../../lib/mockTasks';
import { STATE_LABELS, type TaskState } from '../../lib/tasks';
import { Drawer } from '../../ui/patterns/Drawer';
import { NotFound } from '../system/SystemScreens';
import { TaskBody } from './TaskBody';
import './TaskDetail.css';

/** Everything both halves of the fork need, in one place. */
function useTaskActions(id: string | undefined) {
  const { byId, setState } = useTasks();
  const { session } = useAuth();
  const can = usePermissionCheck();
  const toast = useToast();

  const task = id ? byId(id) : undefined;
  const me = session ? PERSON_BY_EMAIL[session.email] : undefined;

  function move(next: TaskState) {
    if (!task) return;
    const undo = setState(task.id, next);
    toast.show(`${task.number} moved to ${STATE_LABELS[next]}`, {
      tone: 'success',
      action: { label: 'Undo', onAction: undo },
    });
  }

  return { task, me, can, move };
}

/**
 * The desktop half of fork #3 (§8): a 480px right drawer.
 *
 * It is rendered by the shell rather than by a route, and driven by a `?task=`
 * search param, so whatever screen opened it stays mounted underneath —
 * §9.8 requires the board to remain visible and interactive behind the drawer,
 * which a route change could not do.
 */
export function TaskDrawer() {
  const [params] = useSearchParams();
  const id = params.get(TASK_PARAM) ?? undefined;
  const close = useCloseTask();
  const { task, me, can, move } = useTaskActions(id);

  if (!id) return null;

  return (
    <Drawer open onClose={close} label={task ? `Task ${task.number}` : 'Task'}>
      {task ? (
        <TaskBody task={task} me={me} can={can} onMove={move} onBack={close} showBack={false} />
      ) : (
        <div className="task">
          <NotFound />
        </div>
      )}
    </Drawer>
  );
}

/**
 * The mobile half of fork #3: a full-screen route at `/task/:id`.
 *
 * A desktop viewport landing here — a shared link, a bookmark — is sent to the
 * task's own board with the drawer open, which is the desktop presentation of
 * the same thing.
 */
export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const { task, me, can, move } = useTaskActions(id);

  if (!task) return <NotFound />;
  if (isDesktop) {
    return <Navigate to={`/board/${task.boardSlug}?${TASK_PARAM}=${task.id}`} replace />;
  }

  return (
    <div className="task-screen">
      <TaskBody
        task={task}
        me={me}
        can={can}
        onMove={move}
        onBack={() => navigate(-1)}
        showBack
      />
    </div>
  );
}
