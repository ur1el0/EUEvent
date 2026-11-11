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

/** Plain-language status for a ticket, replacing raw API words such as `in_progress`. */
export function getTicketStatusLabel(ticket: StudentTicket): string {
  if (ticket.status === 'claimed') return 'Used';
  if (ticket.status === 'revoked') return 'Revoked';

  const eventLabels: Record<StudentTicket['event']['status'], string> = {
    draft: 'Not scheduled yet',
    scheduled: 'Entry opens soon',
    in_progress: 'Entry open',
    postponed: 'Postponed',
    cancelled: 'Cancelled',
    completed: 'Ended',
  };

  return eventLabels[ticket.event.status];
}
