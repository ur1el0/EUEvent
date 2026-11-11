import { AlertTriangle } from 'lucide-react';
import { affectsDownloadedTicketLists } from '../../services/eventLifecycle';
import type { useEventEditor } from '../../hooks/useEventEditor';
import type { AdminEvent } from '../../types/events';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EventEditorDialogProps {
  event: AdminEvent;
  editor: ReturnType<typeof useEventEditor>;
}

/** One confirmation dialog for saving edits and for Schedule, Start, Complete, Postpone and Cancel. */
export function EventEditorDialog({ event, editor }: EventEditorDialogProps) {
  const { dialog } = editor;
  const common = { busy: editor.isBusy, error: editor.dialogError, onConfirm: editor.confirm, onCancel: editor.cancel };

  if (dialog?.kind === 'action') {
    const { action } = dialog;

    return (
      <ConfirmDialog
        open
        {...common}
        title={action.dialogTitle}
        confirmLabel={action.confirmLabel}
        tone={action.tone === 'danger' ? 'danger' : 'default'}
        reason={{
          label: 'Reason', value: editor.reason, onChange: editor.setReason, required: action.needsReason,
          hint: action.needsReason ? 'Saved in the event change log.' : undefined,
        }}
      >
        <p><strong>{event.name}</strong></p>
        <p>{action.dialogBody}</p>
      </ConfirmDialog>
    );
  }

  return (
    <ConfirmDialog
      open={dialog?.kind === 'save'}
      {...common}
      title="Save these changes?"
      confirmLabel="Save event changes"
      reason={{
        label: 'Change reason', value: editor.reason, onChange: editor.setReason, required: editor.saveNeedsReason,
        hint: editor.saveNeedsReason ? 'Required because the schedule of a non-draft event is changing.' : undefined,
      }}
    >
      <ul className="change-list">
        {editor.changes.map((change) => (
          <li key={change.field}><strong>{change.field}</strong><span><s>{change.from}</s> → {change.to}</span></li>
        ))}
      </ul>
      <p>The configuration version will increase.</p>
      {affectsDownloadedTicketLists(event.status) && (
        <p className="dialog-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Phones that already downloaded a ticket list will not see this change until they sync.</span>
        </p>
      )}
    </ConfirmDialog>
  );
}
