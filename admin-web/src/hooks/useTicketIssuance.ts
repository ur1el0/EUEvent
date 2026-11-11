import { useEffect, useState, type FormEvent } from 'react';
import { issueEventTicket } from '../services/eventService';
import { describeIssueError, describeIssuedTicket } from '../services/ticketIssueMessages';
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
      flash.setNotice(describeIssuedTicket(result, event.status === 'scheduled' || event.status === 'in_progress'));
    } catch (cause) {
      flash.setError(describeIssueError(cause));
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
