import { ApiError } from './apiClient';
import { errorMessage } from './errorMessage';
import type { IssuedTicketResult } from '../types/events';

export const NOT_REGISTERED_MESSAGE =
  'No account is registered with this student number yet. Ask the student to create their account in the mobile app, then try again.';

/** Who a ticket was issued to, with the registered name and email when the API sends them. */
export function describeIssuedTicket(result: IssuedTicketResult, isEntryOpen: boolean): string {
  const { ticket } = result;
  const details = [ticket.student_name, ticket.student_email ? `(${ticket.student_email})` : ''].filter(Boolean).join(' ');
  const who = `Ticket #${ticket.id} issued to student ${ticket.student_number}${details ? ` — ${details}` : ''}.`;

  return isEntryOpen
    ? `${who} They can refresh the mobile app to display it.`
    : `${who} Its rotating pass becomes available after the event is scheduled.`;
}

/** A student number with no account gets a plain explanation instead of the server's short message. */
export function describeIssueError(cause: unknown): string {
  if (cause instanceof ApiError && cause.errors.student_number?.some((message) => /no student account/i.test(message))) {
    return NOT_REGISTERED_MESSAGE;
  }

  return errorMessage(cause, 'Could not issue the ticket.');
}
