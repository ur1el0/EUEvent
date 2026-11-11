import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEvents } from '../services/eventService';
import { errorMessage } from '../services/errorMessage';
import type { AdminEvent } from '../types/events';

/** The event list, the selected event, and helpers to merge a changed event back into the list. */
export function useEventList(token: string) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    fetchEvents(token)
      .then((list) => {
        if (!isCurrent) return;
        setEvents(list);
        setSelectedEventId((current) => current ?? list[0]?.id ?? null);
      })
      .catch((cause: unknown) => {
        if (isCurrent) setError(errorMessage(cause, 'Could not load events.'));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => { isCurrent = false; };
  }, [token]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const replaceEvent = useCallback((updated: AdminEvent) => {
    setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
  }, []);

  const addEvent = useCallback((created: AdminEvent) => {
    setEvents((current) => [created, ...current]);
    setSelectedEventId(created.id);
  }, []);

  const patchEvent = useCallback((eventId: number, update: (event: AdminEvent) => AdminEvent) => {
    setEvents((current) => current.map((event) => (event.id === eventId ? update(event) : event)));
  }, []);

  return { events, selectedEvent, selectedEventId, setSelectedEventId, isLoading, error, replaceEvent, addEvent, patchEvent };
}
