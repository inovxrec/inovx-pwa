import { LEGAL_TRANSITIONS, STATE_LABELS, type Task, type TaskState } from '../../lib/tasks';
import { StatePill } from '../../ui/primitives/StatePill';
import { Sheet } from '../../ui/patterns/Sheet';
import './StateSheet.css';

export interface StateSheetProps {
  /** The task whose state is being changed, or null when the sheet is closed. */
  task: Task | null;
  onClose: () => void;
  onPick: (task: Task, state: TaskState) => void;
}

/**
 * §9.7 — the mobile state changer. It lists **only** the legal transitions:
 * an illegal move is not rendered, not greyed out, so nobody spends a tap
 * finding out they cannot do something.
 *
 * Shared by the board's grouped list and My Day's long-press.
 */
export function StateSheet({ task, onClose, onPick }: StateSheetProps) {
  if (!task) return null;

  const options = LEGAL_TRANSITIONS[task.state];

  return (
    <Sheet open onClose={onClose} title={`Move ${task.number}`}>
      <p className="state-sheet__task body-sm">{task.title}</p>

      <ul className="state-sheet__list" role="list">
        {options.map((state) => (
          <li key={state}>
            <button
              type="button"
              className="state-sheet__option"
              onClick={() => onPick(task, state)}
            >
              <StatePill state={state} />
              <span className="state-sheet__label">Move to {STATE_LABELS[state]}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
