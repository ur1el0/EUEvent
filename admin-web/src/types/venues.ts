export interface VenueGate {
  id: number;
  code: string;
  name: string;
}

export interface Venue {
  id: number;
  name: string;
  location_details: string | null;
  gates: VenueGate[];
}

/** GET /api/v1/admin/venues (planned). */
export interface VenuesResponse {
  venues: Venue[];
}

/** POST /api/v1/admin/venues (planned). */
export interface CreateVenuePayload {
  name: string;
  location_details: string | null;
}

/** PATCH /api/v1/admin/venues/{venue} (planned). */
export type UpdateVenuePayload = Partial<CreateVenuePayload>;

/** POST /api/v1/admin/venues/{venue}/gates (planned). */
export interface CreateGatePayload {
  code: string;
  name: string;
}

/** PATCH /api/v1/admin/venues/{venue}/gates/{gate} (planned). */
export type UpdateGatePayload = Partial<CreateGatePayload>;

/** Laravel 422 field errors, keyed by field name. */
export type FieldErrors = Record<string, string[]>;
