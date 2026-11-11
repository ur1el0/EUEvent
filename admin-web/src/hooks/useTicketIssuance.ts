import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../services/errorMessage';
import { issueEventTicket } from '../services/eventService';
import type { AdminEvent } from '../types/events';
import type { FlashMessages } from './useFlashMessages';

/** Issues a ticket to one student for one event gate (POST /admin/events/{event}/tickets). */
export function useTicketIssuance(
  token: string,
  event: AdminEvent,
  flash: FlashMessages,
  patchEvent: (eventId: number, update: (event: AdminEvent) => AdminEvent) => void,
) {
  const [studentNumber, setStudentNumber] = useState('');
  const [gateId, setGateId] = useState(String(event.event_gates[0]?.id ?? ''));
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => {
    setStudentNumber('');
    setGateId(String(event.event_gates[0]?.id ?? ''));
  }, [event.id]);

  async function issue(submitEvent: FormEvent<HTMLFormElement>): Promise<void> {
    submitEvent.preventDefault();
    if (!gateId.trim()) return;

    flash.clear();
    setIsIssuing(true);
    try {
      const result = await issueEventTicket(token, event.id, studentNumber, Number(gateId));
      patchEvent(event.id, (current) => ({
        ...current,
        configuration_version: result.configuration_version,
        event_gates: current.event_gates.map((gate) => (gate.id === result.ticket.event_gate_id
          ? { ...gate, ticket_count: gate.ticket_count + 1 }
          : gate)),
      }));
      setStudentNumber('');
      const who = `Ticket #${result.ticket.id} issued to student ${result.ticket.student_number}.`;
      flash.setNotice(event.status === 'scheduled' || event.status === 'in_progress'
        ? `${who} They can refresh the mobile app to display it.`
        : `${who} Its rotating pass becomes available after the event is scheduled.`);
    } catch (cause) {
      flash.setError(errorMessage(cause, 'Could not issue the ticket.'));
    } finally {
      setIsIssuing(false);
    }
  }

  return {
    studentNumber,
    setStudentNumber,
    gateId,
    setGateId,
    isIssuing,
    issue: (submitEvent: FormEvent<HTMLFormElement>) => void issue(submitEvent),
  };
}
