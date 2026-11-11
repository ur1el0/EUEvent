import { apiRequest } from './apiClient';
import { toIsoDateTime } from './eventChanges';
import type { AdminEvent, EventDraft, EventOptions, EventStatus, IssuedTicketResult } from '../types/events';

export async function fetchEvents(token: string): Promise<AdminEvent[]> {
  const result = await apiRequest<{ events: AdminEvent[] }>('/admin/events', { token });
  return result.events;
}

export function fetchEventOptions(token: string): Promise<EventOptions> {
  return apiRequest<EventOptions>('/admin/event-options', { token });
}

export function createEvent(token: string, draft: EventDraft): Promise<AdminEvent> {
  return apiRequest<AdminEvent>('/admin/events', {
    method: 'POST',
    token,
    body: {
      venue_id: Number(draft.venueId),
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      starts_at: toIsoDateTime(draft.startsAt),
      ends_at: toIsoDateTime(draft.endsAt),
    },
  });
}

export function patchEvent(token: string, eventId: number, body: Record<string, unknown>): Promise<AdminEvent> {
  return apiRequest<AdminEvent>('/admin/events/' + eventId, { method: 'PATCH', token, body });
}

export function changeEventStatus(token: string, eventId: number, status: EventStatus, reason: string): Promise<AdminEvent> {
  return patchEvent(token, eventId, { status, reason: reason.trim() || null });
}

export function saveEventGates(
  token: string,
  eventId: number,
  gates: { venue_gate_id: number; capacity: number | null; security_staff_ids: number[] }[],
  reason: string,
): Promise<AdminEvent> {
  return apiRequest<AdminEvent>('/admin/events/' + eventId + '/gates', {
    method: 'PUT',
    token,
    body: { gates, reason: reason.trim() || null },
  });
}

export function issueEventTicket(
  token: string,
  eventId: number,
  studentNumber: string,
  eventGateId: number,
): Promise<IssuedTicketResult> {
  return apiRequest<IssuedTicketResult>('/admin/events/' + eventId + '/tickets', {
    method: 'POST',
    token,
    body: { student_number: studentNumber.trim(), event_gate_id: eventGateId },
  });
}
