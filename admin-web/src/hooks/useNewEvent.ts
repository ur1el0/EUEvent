import { useState, type FormEvent } from 'react';
import { emptyEventDraft } from '../services/eventChanges';
import { errorMessage } from '../services/errorMessage';
import { changeEventStatus, createEvent } from '../services/eventService';
import type { AdminEvent, EventDraft } from '../types/events';
import type { Venue } from '../types/venues';
import type { FlashMessages } from './useFlashMessages';

/** The "new event" form. It can create a draft, or create it and schedule it in one step. */
export function useNewEvent(token: string, venues: Venue[], flash: FlashMessages, onCreated: (event: AdminEvent) => void, onUpdated: (event: AdminEvent) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<EventDraft>(emptyEventDraft());
  const [isCreating, setIsCreating] = useState(false);
  // Default to the first venue, including a venue that was added after this form was first shown.
  const draft = { ...values, venueId: values.venueId || String(venues[0]?.id ?? '') };

  async function submit(scheduleNow: boolean): Promise<void> {
    flash.clear();
    setIsCreating(true);

    let created: AdminEvent | null = null;
    try {
      created = await createEvent(token, draft);
      onCreated(created);
      setValues(emptyEventDraft());
      setIsOpen(false);

      if (!scheduleNow) {
        flash.setNotice('Draft event created. It is not open for entry: gate staff cannot download a ticket list until you schedule it.');
        return;
      }

      onUpdated(await changeEventStatus(token, created.id, 'scheduled', ''));
      flash.setNotice('Event created and scheduled. Gate staff can download ticket lists once gates and staff are assigned.');
    } catch (cause) {
      flash.setError(created
        ? `The draft was created but could not be scheduled: ${errorMessage(cause, 'unknown error')}`
        : errorMessage(cause, 'Could not create the event.'));
    } finally {
      setIsCreating(false);
    }
  }

  return {
    isOpen,
    toggle: () => { setIsOpen((current) => !current); flash.clear(); },
    draft,
    setField: (key: keyof EventDraft, value: string) => setValues((current) => ({ ...current, venueId: current.venueId || draft.venueId, [key]: value })),
    isCreating,
    canSubmit: Boolean(draft.name.trim() && draft.venueId && draft.startsAt && draft.endsAt),
    submitDraft: (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(false); },
    submitAndSchedule: () => void submit(true),
  };
}
