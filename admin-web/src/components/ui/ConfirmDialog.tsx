import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface ConfirmReason {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
  hint?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  /** The real action, such as "Delete account". Never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  error?: string | null;
  reason?: ConfirmReason;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation built on the native <dialog>: focus moves in and stays inside, Escape cancels,
 * and focus returns to the button that opened it. Used for deletes, event saves and status changes.
 */
export function ConfirmDialog({
  open, title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'default', busy = false,
  error = null, reason, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const reasonId = useId();
  const reasonMissing = Boolean(reason?.required && !reason.value.trim());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      if (openerRef.current?.isConnected) openerRef.current.focus();
    }
  }, [open]);

  useEffect(() => () => dialogRef.current?.close(), []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
    >
      {open && (
        <form className="confirm-dialog__form" onSubmit={(event) => { event.preventDefault(); if (!busy && !reasonMissing) onConfirm(); }}>
          <h2 id={titleId}>{title}</h2>
          <div id={bodyId} className="confirm-dialog__body">{children}</div>
          {reason && (
            <div className="confirm-dialog__reason">
              <label htmlFor={reasonId}>{reason.label}{reason.required ? ' (required)' : ' (optional)'}</label>
              <textarea id={reasonId} rows={3} maxLength={1000} required={reason.required} data-autofocus
                value={reason.value} onChange={(event) => reason.onChange(event.target.value)} />
              {reason.hint && <p>{reason.hint}</p>}
            </div>
          )}
          {error && <p className="confirm-dialog__error" role="alert"><AlertCircle size={16} /> {error}</p>}
          <div className="confirm-dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}
              {...(reason ? {} : { 'data-autofocus': true })}>
              {cancelLabel}
            </button>
            <button type="submit" className={tone === 'danger' ? 'btn btn--danger' : 'btn btn--primary'} disabled={busy || reasonMissing}>
              {busy ? <><Loader2 size={16} className="spin" /> Working…</> : confirmLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
