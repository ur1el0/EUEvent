import { apiRequest } from './apiClient';

export type GateManifestTicket = {
  ticket_id: number;
  student_number: string | null;
  totp_secret: string;
  gate_id: number;
  status: 'unclaimed' | 'claimed';
};

export type GateManifest = {
  gate_id: number;
  event_status: 'scheduled' | 'in_progress';
  manifest_version: number;
  // Optional so manifests cached before these fields existed still load.
  event_starts_at?: string;
  event_ends_at?: string;
  generated_at?: string;
  tickets: GateManifestTicket[];
};

export async function fetchGateManifest(token: string, gateId: number): Promise<GateManifest> {
  const payload = await apiRequest<unknown>(`/gates/${gateId}/manifest`, { token });

  if (!isGateManifest(payload) || payload.gate_id !== gateId) {
    throw new Error('The event server returned an invalid ticket list for this gate.');
  }

  return payload;
}

function isOptionalTimestamp(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
}

function isGateManifest(payload: unknown): payload is GateManifest {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const manifest = payload as Partial<GateManifest>;

  return Number.isInteger(manifest.gate_id)
    && (manifest.event_status === 'scheduled' || manifest.event_status === 'in_progress')
    && Number.isInteger(manifest.manifest_version)
    && isOptionalTimestamp(manifest.event_starts_at)
    && isOptionalTimestamp(manifest.event_ends_at)
    && isOptionalTimestamp(manifest.generated_at)
    && Array.isArray(manifest.tickets)
    && manifest.tickets.every((ticket) => typeof ticket === 'object'
      && ticket !== null
      && Number.isInteger(ticket.ticket_id)
      && (typeof ticket.student_number === 'string' || ticket.student_number === null)
      && typeof ticket.totp_secret === 'string'
      && ticket.totp_secret.length > 0
      && Number.isInteger(ticket.gate_id)
      && (ticket.status === 'unclaimed' || ticket.status === 'claimed'));
}
