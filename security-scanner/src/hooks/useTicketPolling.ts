import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getTicketPollIntervalMs, shouldPollTickets } from '../services/ticketStatus';
import type { StudentTicket } from '../services/studentTickets';

type TicketPollingOptions = {
  isStudent: boolean;
  /** The full-screen pass is open, so the student is at the gate. */
  isPassOpen: boolean;
  lastFetchFailed: boolean;
  tickets: readonly StudentTicket[];
  /** Quietly reloads the tickets, with no spinner. */
  refreshSilently: () => void;
};

/** Keeps a student's tickets fresh so a scan at the gate shows up on their phone within seconds. */
export function useTicketPolling({ isStudent, isPassOpen, lastFetchFailed, tickets, refreshSilently }: TicketPollingOptions) {
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');
  const refreshRef = useRef(refreshSilently);

  useEffect(() => {
    refreshRef.current = refreshSilently;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsForeground(state === 'active');
      if (state === 'active' && isStudent) refreshRef.current();
    });
    return () => subscription.remove();
  }, [isStudent]);

  const isPolling = shouldPollTickets({ isStudent, isForeground, tickets });
  const intervalMs = getTicketPollIntervalMs({ isPassOpen, lastFetchFailed });

  useEffect(() => {
    if (!isPolling) return undefined;
    const timer = setInterval(() => refreshRef.current(), intervalMs);
    return () => clearInterval(timer);
  }, [isPolling, intervalMs]);
}
