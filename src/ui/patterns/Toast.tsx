import { useEffect } from 'react';
import { cn } from '../../lib/cn';
import { IconClose } from '../icons';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import type { Toast as ToastData } from '../../hooks/useToast';
import './Toast.css';

/** §7.15 — 4s, except errors, which persist until dismissed. */
export const TOAST_DURATION = 4000;

export interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const persists = toast.tone === 'error';

  useEffect(() => {
    if (persists) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [persists, toast.id, onDismiss]);

  return (
    <div
      className={cn('toast', 'surface-paper', `toast--${toast.tone}`)}
      role={persists ? 'alert' : 'status'}
    >
      <span className="toast__bar" aria-hidden="true" />

      <p className="toast__body body-sm">{toast.message}</p>

      {toast.action && (
        <Button
          variant="ghost"
          size="sm"
          className="toast__action"
          onClick={() => {
            toast.action!.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      )}

      <IconButton
        label="Dismiss"
        icon={<IconClose />}
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
      />

      {/* The thin flame line that runs out with the timer. Errors have none. */}
      {!persists && <span className="toast__timer" aria-hidden="true" />}
    </div>
  );
}
