import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { errorMessage } from '../services/errorMessage';
import { FeatureUnavailableError } from '../services/plannedApi';
import { createGate, createVenue, fetchVenues, updateGate, updateVenue } from '../services/venueService';
import type {
  CreateGatePayload, CreateVenuePayload, FieldErrors, UpdateGatePayload, UpdateVenuePayload, Venue,
} from '../types/venues';
import { useFlashMessages } from './useFlashMessages';

export type SubmitResult = { ok: true } | { ok: false; message: string; errors: FieldErrors };

function failure(cause: unknown, fallback: string): SubmitResult {
  return {
    ok: false,
    message: errorMessage(cause, fallback),
    errors: cause instanceof ApiError ? cause.errors : {},
  };
}

/**
 * Venues and their gates through the planned /admin/venues endpoints. `onChanged` runs after every
 * successful change so the event-options list (used by the new-event form) is refetched.
 */
export function useVenues(token: string, onChanged: () => Promise<void>) {
  const flash = useFlashMessages();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    fetchVenues(token)
      .then((list) => { if (isCurrent) setVenues(list); })
      .catch((cause: unknown) => {
        if (!isCurrent) return;
        if (cause instanceof FeatureUnavailableError) setIsUnavailable(true);
        else flash.setError(errorMessage(cause, 'Could not load venues.'));
      })
      .finally(() => { if (isCurrent) setIsLoading(false); });

    return () => { isCurrent = false; };
  }, [token]);

  const run = useCallback(async (action: () => Promise<void>, notice: string, fallback: string): Promise<SubmitResult> => {
    flash.clear();
    try {
      await action();
      flash.setNotice(notice);
      await onChanged();
      return { ok: true };
    } catch (cause) {
      return failure(cause, fallback);
    }
  }, [flash, onChanged]);

  const replaceVenue = (venue: Venue) => setVenues((current) => current.map((item) => (item.id === venue.id ? venue : item)));

  return {
    ...flash,
    venues,
    isLoading,
    isUnavailable,
    create: (body: CreateVenuePayload) => run(async () => {
      const created = await createVenue(token, body);
      setVenues((current) => [...current, { ...created, gates: created.gates ?? [] }]);
    }, `Venue "${body.name}" created. Add its gates next.`, 'Could not create the venue.'),
    edit: (venueId: number, body: UpdateVenuePayload) => run(async () => {
      const updated = await updateVenue(token, venueId, body);
      setVenues((current) => current.map((item) => (item.id === venueId ? { ...item, ...updated, gates: updated.gates ?? item.gates } : item)));
    }, 'Venue updated.', 'Could not update the venue.'),
    addGate: (venueId: number, body: CreateGatePayload) => run(async () => {
      const gate = await createGate(token, venueId, body);
      setVenues((current) => current.map((item) => (item.id === venueId ? { ...item, gates: [...item.gates, gate] } : item)));
    }, `Gate ${body.code} added.`, 'Could not add the gate.'),
    editGate: (venueId: number, gateId: number, body: UpdateGatePayload) => run(async () => {
      const gate = await updateGate(token, venueId, gateId, body);
      const target = venues.find((item) => item.id === venueId);
      if (target) replaceVenue({ ...target, gates: target.gates.map((item) => (item.id === gateId ? { ...item, ...gate } : item)) });
    }, 'Gate updated.', 'Could not update the gate.'),
  };
}
