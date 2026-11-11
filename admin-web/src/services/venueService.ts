import { plannedRequest } from './plannedApi';
import type {
  CreateGatePayload,
  CreateVenuePayload,
  UpdateGatePayload,
  UpdateVenuePayload,
  Venue,
  VenueGate,
  VenuesResponse,
} from '../types/venues';

// These routes are planned (docs/api.md) and may not exist on the server yet.

export async function fetchVenues(token: string): Promise<Venue[]> {
  const result = await plannedRequest<VenuesResponse>('/admin/venues', { token });
  return result.venues;
}

export function createVenue(token: string, body: CreateVenuePayload): Promise<Venue> {
  return plannedRequest<Venue>('/admin/venues', { method: 'POST', token, body });
}

export function updateVenue(token: string, venueId: number, body: UpdateVenuePayload): Promise<Venue> {
  return plannedRequest<Venue>('/admin/venues/' + venueId, { method: 'PATCH', token, body });
}

export function createGate(token: string, venueId: number, body: CreateGatePayload): Promise<VenueGate> {
  return plannedRequest<VenueGate>('/admin/venues/' + venueId + '/gates', { method: 'POST', token, body });
}

export function updateGate(token: string, venueId: number, gateId: number, body: UpdateGatePayload): Promise<VenueGate> {
  return plannedRequest<VenueGate>('/admin/venues/' + venueId + '/gates/' + gateId, { method: 'PATCH', token, body });
}
