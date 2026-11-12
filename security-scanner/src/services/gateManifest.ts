import { apiRequest } from './apiClient';
import { isGateManifest, type GateManifest } from './gateManifestContract';
export { isGateManifest, type GateManifest, type GateManifestTicket } from './gateManifestContract';

export async function fetchGateManifest(token: string, gateId: number): Promise<GateManifest> {
  const payload = await apiRequest<unknown>(`/gates/${gateId}/manifest`, { token });

  if (!isGateManifest(payload) || payload.gate_id !== gateId) {
    throw new Error('The event server returned an invalid ticket list for this gate.');
  }

  return payload;
}
