import { apiRequest } from './apiClient';
import { isStudentTicket, type StudentTicket } from './studentTicketContract';
export { isStudentTicket, type StudentTicket } from './studentTicketContract';

export async function fetchStudentTickets(token: string): Promise<StudentTicket[]> {
  const payload = await apiRequest<unknown>('/student/tickets', { token });

  if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as { tickets?: unknown }).tickets)) {
    throw new Error('The event server returned an invalid ticket list.');
  }

  const tickets = (payload as { tickets: unknown[] }).tickets;
  if (!tickets.every(isStudentTicket)) {
    throw new Error('The event server returned an invalid student ticket.');
  }

  return tickets;
}
