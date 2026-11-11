import { apiRequest } from './apiClient';
import type {
  CreateGatePayload,
  CreateVenuePayload,
  UpdateGatePayload,
  UpdateVenuePayload,
  Venue,
  VenueGate,
  VenuesResponse,
} from '../types/venues';

export async function fetchVenues(token: string): Promise<Venue[]> {
  const result = await apiRequest<VenuesResponse>('/admin/venues', { token });
  return result.venues;
}

export function createVenue(token: string, body: CreateVenuePayload): Promise<Venue> {
  return apiRequest<Venue>('/admin/venues', { method: 'POST', token, body });
}

export function updateVenue(token: string, venueId: number, body: UpdateVenuePayload): Promise<Venue> {
  return apiRequest<Venue>('/admin/venues/' + venueId, { method: 'PATCH', token, body });
}

export function createGate(token: string, venueId: number, body: CreateGatePayload): Promise<VenueGate> {
  return apiRequest<VenueGate>('/admin/venues/' + venueId + '/gates', { method: 'POST', token, body });
}

export function updateGate(token: string, venueId: number, gateId: number, body: UpdateGatePayload): Promise<VenueGate> {
  return apiRequest<VenueGate>('/admin/venues/' + venueId + '/gates/' + gateId, { method: 'PATCH', token, body });
}
