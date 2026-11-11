import { Loader2, TicketCheck } from 'lucide-react';
import { useStudentLookup } from '../../hooks/useStudentLookup';
import { isFinalStatus } from '../../services/eventLifecycle';
import type { useTicketIssuance } from '../../hooks/useTicketIssuance';
import type { AdminEvent } from '../../types/events';
import { StudentLookupNote } from './StudentLookupNote';

interface TicketIssuancePanelProps {
  token: string;
  event: AdminEvent;
  issuance: ReturnType<typeof useTicketIssuance>;
}

export function TicketIssuancePanel({ token, event, issuance }: TicketIssuancePanelProps) {
  const lookup = useStudentLookup(token, issuance.studentNumber);

  return (
    <section className="surface-card panel ticket-issuance-panel" aria-labelledby="ticket-issuance-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Student access</span><h2 id="ticket-issuance-title">Issue a ticket</h2></div>
        <span className="panel-icon"><TicketCheck size={19} /></span>
      </div>
      {event.event_gates.length === 0 ? (
        <p className="event-empty-copy">Assign at least one event gate before issuing student tickets.</p>
      ) : (
        <form className="event-form ticket-issuance-form" onSubmit={issuance.issue}>
          <label htmlFor="ticket-student-number">Student number</label>
          <input id="ticket-student-number" maxLength={32} required value={issuance.studentNumber} placeholder="e.g. A12-34567"
            onChange={(change) => issuance.setStudentNumber(change.target.value)} />
          <StudentLookupNote lookup={lookup} />
          <label htmlFor="ticket-event-gate">Event gate</label>
          <select id="ticket-event-gate" required value={issuance.gateId} onChange={(change) => issuance.setGateId(change.target.value)}>
            {event.event_gates.map((gate) => (
              <option value={gate.id} key={gate.id}>
                {(gate.code ?? 'Gate') + ' · ' + (gate.name ?? 'Unnamed gate') + ' · ' + gate.ticket_count + (gate.capacity === null ? '' : '/' + gate.capacity) + ' tickets'}
              </option>
            ))}
          </select>
          <p className="ticket-issuance-note">The student must have created their account in the mobile app first. Ticket secrets are delivered only to that student’s authenticated mobile app.</p>
          <button className="btn btn--primary" type="submit"
            disabled={issuance.isIssuing || isFinalStatus(event.status) || !issuance.studentNumber.trim()}>
            {issuance.isIssuing ? <><Loader2 size={16} className="spin" /> Issuing…</> : <><TicketCheck size={16} /> Issue student ticket</>}
          </button>
        </form>
      )}
    </section>
  );
}
