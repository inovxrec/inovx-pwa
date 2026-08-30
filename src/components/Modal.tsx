import type { ReactNode } from 'react';
import { Button } from './Button';
import './Modal.css';

interface ModalProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-confirm modal. Every delete/cancel action in the product routes
 * through this — no destructive action fires directly off a single click.
 */
export function Modal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-scrim show" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{body}</div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
