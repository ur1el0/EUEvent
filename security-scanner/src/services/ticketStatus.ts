// Pure ticket display rules. Only type imports, so it runs under `node --test`.
import type { StudentTicket } from './studentTickets';

/** A pass can be shown for an issued ticket to a scheduled or running event with a saved secret. */
export function canShowTicketPass(ticket: StudentTicket): boolean {
  const isEventEntryOpen = ticket.event.status === 'scheduled' || ticket.event.status === 'in_progress';
  return ticket.status === 'issued' && isEventEntryOpen && ticket.totp_secret !== null;
}
