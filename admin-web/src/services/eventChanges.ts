import type { AdminEvent, EventChange, EventDraft } from '../types/events';

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

export function emptyEventDraft(venueId = ''): EventDraft {
  return { venueId, name: '', description: '', startsAt: '', endsAt: '' };
}

export function eventDraftFrom(event: AdminEvent): EventDraft {
  return {
    venueId: String(event.venue_id),
    name: event.name,
    description: event.description ?? '',
    startsAt: toLocalDateTime(event.starts_at),
    endsAt: toLocalDateTime(event.ends_at),
  };
}

function formatLocalInput(value: string): string {
  return value ? formatDate(toIsoDateTime(value)) : 'Not set';
}

export function isScheduleChanged(event: AdminEvent, draft: EventDraft): boolean {
  return draft.startsAt !== toLocalDateTime(event.starts_at) || draft.endsAt !== toLocalDateTime(event.ends_at);
}

/** Every difference between the saved event and the edit form, as old -> new text. */
export function describeEventChanges(event: AdminEvent, draft: EventDraft): EventChange[] {
  const changes: EventChange[] = [];

  if (draft.name.trim() !== event.name) {
    changes.push({ field: 'Event name', from: event.name, to: draft.name.trim() });
  }
  if ((draft.description.trim() || null) !== event.description) {
    changes.push({ field: 'Description', from: event.description || 'None', to: draft.description.trim() || 'None' });
  }
  if (draft.startsAt !== toLocalDateTime(event.starts_at)) {
    changes.push({ field: 'Starts', from: formatDate(event.starts_at), to: formatLocalInput(draft.startsAt) });
  }
  if (draft.endsAt !== toLocalDateTime(event.ends_at)) {
    changes.push({ field: 'Ends', from: formatDate(event.ends_at), to: formatLocalInput(draft.endsAt) });
  }

  return changes;
}

/** The PATCH body for the fields that actually changed. */
export function buildEventPatch(event: AdminEvent, draft: EventDraft, reason: string): Record<string, unknown> {
  const patch: Record<string, unknown> = { reason: reason.trim() || null };

  if (draft.name.trim() !== event.name) patch.name = draft.name.trim();
  if ((draft.description.trim() || null) !== event.description) patch.description = draft.description.trim() || null;
  if (draft.startsAt !== toLocalDateTime(event.starts_at)) patch.starts_at = toIsoDateTime(draft.startsAt);
  if (draft.endsAt !== toLocalDateTime(event.ends_at)) patch.ends_at = toIsoDateTime(draft.endsAt);

  return patch;
}
