// Pure ticket display rules. Only type imports, so it runs under `node --test`.
import type { StudentTicket } from './studentTickets';

/** A pass can be shown for an issued ticket to a scheduled or running event with a saved secret. */
export function canShowTicketPass(ticket: StudentTicket): boolean {
  const isEventEntryOpen = ticket.event.status === 'scheduled' || ticket.event.status === 'in_progress';
  return ticket.status === 'issued' && isEventEntryOpen && ticket.totp_secret !== null;
}

/**
 * Usable passes first, soonest event start first; then every other ticket, most recent event first.
 * Tickets with an unreadable start time go last in their group.
 */
export function sortTicketsForDisplay(tickets: readonly StudentTicket[]): StudentTicket[] {
  const startOf = (ticket: StudentTicket) => {
    const time = Date.parse(ticket.event.starts_at);
    return Number.isNaN(time) ? null : time;
  };

  return [...tickets].sort((left, right) => {
    const leftActive = canShowTicketPass(left);
    const rightActive = canShowTicketPass(right);
    if (leftActive !== rightActive) return leftActive ? -1 : 1;

    const leftStart = startOf(left);
    const rightStart = startOf(right);
    if (leftStart === null || rightStart === null) {
      return leftStart === rightStart ? 0 : leftStart === null ? 1 : -1;
    }

    return leftActive ? leftStart - rightStart : rightStart - leftStart;
  });
}

const eventLabels: Record<StudentTicket['event']['status'], string> = {
  draft: 'Not scheduled yet',
  scheduled: 'Entry opens soon',
  in_progress: 'Entry open',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
  completed: 'Ended',
};

/** Plain-language event status, replacing raw API words such as `in_progress`. Shared by student and staff screens. */
export function getEventStatusLabel(eventStatus: StudentTicket['event']['status']): string {
  return eventLabels[eventStatus];
}

/** Plain-language status for a ticket: Used or Revoked first, otherwise the event's status. */
export function getTicketStatusLabel(ticket: StudentTicket): string {
  if (ticket.status === 'claimed') return 'Used';
  if (ticket.status === 'revoked') return 'Revoked';

  return getEventStatusLabel(ticket.event.status);
}

/** While the full-screen pass is open the student is at the gate, so check often. */
export const PASS_OPEN_POLL_MS = 1_500;
export const TICKET_POLL_INTERVAL_MS = 5_000;
/** Slow down after a failed fetch so a bad connection is not hammered. */
export const FAILED_POLL_MS = 15_000;

/** How long to wait between checks: fastest at the gate, slowest after a failure. */
export function getTicketPollIntervalMs({ isPassOpen, lastFetchFailed }: { isPassOpen: boolean; lastFetchFailed: boolean }): number {
  if (isPassOpen) return PASS_OPEN_POLL_MS;
  return lastFetchFailed ? FAILED_POLL_MS : TICKET_POLL_INTERVAL_MS;
}

type TicketPollState = {
  isStudent: boolean;
  isForeground: boolean;
  tickets: readonly StudentTicket[];
};

/** Poll only for a student with the app open and at least one ticket still waiting to be scanned. */
export function shouldPollTickets({ isStudent, isForeground, tickets }: TicketPollState): boolean {
  return isStudent && isForeground && tickets.some((ticket) => ticket.status === 'issued');
}

/** True only for the moment a ticket goes from issued to claimed, so loading an already-used ticket never fires it. */
export function didTicketGetScanned(previous: StudentTicket['status'], next: StudentTicket['status']): boolean {
  return previous === 'issued' && next === 'claimed';
}
