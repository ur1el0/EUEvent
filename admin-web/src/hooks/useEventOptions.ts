import { useCallback, useEffect, useState } from 'react';
import { fetchEventOptions } from '../services/eventService';
import { errorMessage } from '../services/errorMessage';
import type { SecurityStaff } from '../types';
import type { Venue } from '../types/venues';

/**
 * Venues (with their gates) and staff choices for event setup, from GET /admin/event-options.
 * Held by the dashboard so the Venues workspace can refresh it and the new-event form sees new venues.
 */
export function useEventOptions(token: string) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [securityStaff, setSecurityStaff] = useState<SecurityStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const result = await fetchEventOptions(token);
      setVenues(result.venues);
      setSecurityStaff(result.security_staff);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not load venue and staff options.'));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { venues, securityStaff, isLoading, error, refresh };
}

export type EventOptionsState = ReturnType<typeof useEventOptions>;
