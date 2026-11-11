import { useEffect, useState } from 'react';
import { buildEventPatch, describeEventChanges, eventDraftFrom, isScheduleChanged } from '../services/eventChanges';
import { errorMessage } from '../services/errorMessage';
import { changeEventStatus, patchEvent } from '../services/eventService';
import { isReasonRequiredForEdit, type LifecycleAction } from '../services/eventLifecycle';
import type { AdminEvent } from '../types/events';
import type { FlashMessages } from './useFlashMessages';

interface EventEditorOptions {
  token: string;
  event: AdminEvent;
  flash: FlashMessages;
  onUpdated: (event: AdminEvent) => void;
}

/** What the open confirmation dialog is for: saving edits, or one lifecycle action. */
export type EditorDialog = { kind: 'save' } | { kind: 'action'; action: LifecycleAction } | null;

/** Edit form, save confirmation and status actions for one event. Every change is confirmed first. */
export function useEventEditor({ token, event, flash, onUpdated }: EventEditorOptions) {
  const [draft, setDraft] = useState(() => eventDraftFrom(event));
  const [reason, setReason] = useState('');
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(eventDraftFrom(event));
    setReason('');
    setDialog(null);
    setDialogError(null);
  }, [event.id, event.configuration_version, event.status]);

  const changes = describeEventChanges(event, draft);
  const isDirty = changes.length > 0;
  const saveNeedsReason = isReasonRequiredForEdit(event.status, isScheduleChanged(event, draft));

  function openDialog(next: EditorDialog): void {
    setReason('');
    setDialogError(null);
    setDialog(next);
  }

  function requestSave(): void {
    flash.clear();
    if (!isDirty) {
      flash.setNotice('No changes to save.');
      return;
    }
    openDialog({ kind: 'save' });
  }

  function requestAction(action: LifecycleAction): void {
    flash.clear();
    if (isDirty) {
      flash.setError('Save or discard your edits before changing the event status.');
      return;
    }
    openDialog({ kind: 'action', action });
  }

  async function confirm(): Promise<void> {
    if (!dialog) return;

    setIsBusy(true);
    setDialogError(null);
    try {
      const updated = dialog.kind === 'save'
        ? await patchEvent(token, event.id, buildEventPatch(event, draft, reason))
        : await changeEventStatus(token, event.id, dialog.action.to, reason);
      onUpdated(updated);
      setDialog(null);
      flash.setNotice(dialog.kind === 'save'
        ? 'Event details saved. The change is recorded in the event change log and the configuration version increased.'
        : `${dialog.action.confirmLabel}: done. The event is now ${updated.status.replace('_', ' ')}.`);
    } catch (cause) {
      setDialogError(errorMessage(cause, 'Could not update the event.'));
    } finally {
      setIsBusy(false);
    }
  }

  return {
    draft,
    setDraft,
    changes,
    isDirty,
    saveNeedsReason,
    reason,
    setReason,
    dialog,
    isBusy,
    dialogError,
    requestSave,
    requestAction,
    confirm: () => void confirm(),
    cancel: () => setDialog(null),
    discard: () => setDraft(eventDraftFrom(event)),
  };
}
