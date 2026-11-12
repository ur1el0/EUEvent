export type StudentTicket = {
  id: number;
  status: 'issued' | 'claimed' | 'revoked';
  totp_secret: string | null;
  gate: {
    id: number;
    code: string;
    name: string;
  };
  event: {
    id: number;
    name: string;
    starts_at: string;
    ends_at: string;
    status: 'draft' | 'scheduled' | 'in_progress' | 'postponed' | 'cancelled' | 'completed';
    venue_name: string;
  };
};

export function isStudentTicket(value: unknown): value is StudentTicket {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const ticket = value as Partial<StudentTicket>;
  const gate = ticket.gate;
  const event = ticket.event;

  return Number.isInteger(ticket.id)
    && (ticket.status === 'issued' || ticket.status === 'claimed' || ticket.status === 'revoked')
    && (typeof ticket.totp_secret === 'string' || ticket.totp_secret === null)
    && typeof gate === 'object'
    && gate !== null
    && Number.isInteger(gate.id)
    && typeof gate.code === 'string'
    && typeof gate.name === 'string'
    && typeof event === 'object'
    && event !== null
    && Number.isInteger(event.id)
    && typeof event.name === 'string'
    && typeof event.starts_at === 'string'
    && typeof event.ends_at === 'string'
    && typeof event.venue_name === 'string'
    && ['draft', 'scheduled', 'in_progress', 'postponed', 'cancelled', 'completed'].includes(event.status);
}
