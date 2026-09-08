import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Toast } from '../ui/patterns/Toast';
import '../ui/patterns/Toast.css';

export type ToastTone = 'neutral' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  /** At most one, and it is a ghost button — "Undo" (§7.15). */
  action?: { label: string; onAction: () => void };
}

export interface ToastContextValue {
  /** Returns the toast's id so a caller can dismiss it early. */
  show: (message: string, options?: { tone?: ToastTone; action?: Toast['action'] }) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** §7.15 — stacks to a maximum of three, oldest dropped. */
const MAX_TOASTS = 3;

let sequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue['show']>((message, options = {}) => {
    sequence += 1;
    const toast: Toast = {
      id: `toast-${sequence}`,
      message,
      tone: options.tone ?? 'neutral',
      action: options.action,
    };
    setToasts((current) => [...current, toast].slice(-MAX_TOASTS));
    return toast.id;
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          /*
            One live region holding the stack rather than one per toast, so a
            screen reader announces arrivals in order. Polite by default; the
            error toasts inside set their own role="alert" (§11).
          */
          <div className="toast-stack" aria-live="polite">
            {toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
