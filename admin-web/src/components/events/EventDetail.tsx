import { useEventEditor } from '../../hooks/useEventEditor';
import type { FlashMessages } from '../../hooks/useFlashMessages';
import { useGateAssignments } from '../../hooks/useGateAssignments';
import { useTicketIssuance } from '../../hooks/useTicketIssuance';
import type { SecurityStaff } from '../../types';
import type { AdminEvent } from '../../types/events';
import type { Venue } from '../../types/venues';
import { TicketRosterPanel } from '../TicketRosterPanel';
import { EventDetailsPanel } from './EventDetailsPanel';
import { GateAssignmentsPanel } from './GateAssignmentsPanel';
import { TicketIssuancePanel } from './TicketIssuancePanel';

interface EventDetailProps {
  token: string;
  event: AdminEvent;
  venues: Venue[];
  securityStaff: SecurityStaff[];
  flash: FlashMessages;
  replaceEvent: (event: AdminEvent) => void;
  patchEvent: (eventId: number, update: (event: AdminEvent) => AdminEvent) => void;
}

/** Everything shown for the selected event: details and status, gates, tickets and the roster. */
export function EventDetail({ token, event, venues, securityStaff, flash, replaceEvent, patchEvent }: EventDetailProps) {
  const editor = useEventEditor({ token, event, flash, onUpdated: replaceEvent });
  const gates = useGateAssignments(token, event, flash, replaceEvent);
  const issuance = useTicketIssuance(token, event, flash, patchEvent);
  const venue = venues.find((item) => item.id === event.venue_id);

  return (
    <div className="event-detail">
      <EventDetailsPanel event={event} editor={editor} />
      <GateAssignmentsPanel event={event} venue={venue} securityStaff={securityStaff} gates={gates} />
      <TicketIssuancePanel event={event} issuance={issuance} />
      <TicketRosterPanel
        key={event.id}
        eventId={event.id}
        configurationVersion={event.configuration_version}
        token={token}
        onTicketRevoked={(eventGateId, version) => patchEvent(event.id, (current) => ({
          ...current,
          configuration_version: version,
          event_gates: current.event_gates.map((gate) => (gate.id === eventGateId
            ? { ...gate, ticket_count: Math.max(0, gate.ticket_count - 1) }
            : gate)),
        }))}
      />
    </div>
  );
}
