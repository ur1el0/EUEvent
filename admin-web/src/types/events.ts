import type { SecurityStaff } from './index';
import type { Venue } from './venues';

export type EventStatus = 'draft' | 'scheduled' | 'in_progress' | 'postponed' | 'cancelled' | 'completed';

export interface EventGate {
  id: number;
  venue_gate_id: number;
  code: string | null;
  name: string | null;
  capacity: number | null;
  ticket_count: number;
  security_staff: SecurityStaff[];
}

export interface AdminEvent {
  id: number;
  venue_id: number;
  venue?: { id: number; name: string };
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  configuration_version: number;
  event_gates: EventGate[];
}

export interface EventOptions {
  venues: Venue[];
  security_staff: SecurityStaff[];
}

/** Form values for an event, kept as strings so inputs stay controlled. */
export interface EventDraft {
  venueId: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
}

export interface GateDraft {
  venueGateId: number;
  capacity: string;
  staffIds: number[];
}

export interface IssuedTicketResult {
  configuration_version: number;
  ticket: {
    id: number;
    student_number: string;
    /** Registered name and email; older API versions do not send them. */
    student_name?: string;
    student_email?: string;
    event_gate_id: number;
    status: string;
  };
}

/** One line in the "what will change" list: the old and new value as readable text. */
export interface EventChange {
  field: string;
  from: string;
  to: string;
}
