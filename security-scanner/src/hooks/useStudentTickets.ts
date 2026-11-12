import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSecuritySession } from './useSecuritySession';
import { useTicketPolling } from './useTicketPolling';
import { ApiError } from '../services/apiClient';
import { fetchStudentTickets, type StudentTicket } from '../services/studentTickets';
import { loadStudentTicketCache, saveStudentTicketCache } from '../services/studentTicketStorage';
import { sortTicketsForDisplay } from '../services/ticketStatus';

/** Loads the student's tickets, falling back to the encrypted copy on this phone when offline. */
export function useStudentTickets({ isPassOpen = false }: { isPassOpen?: boolean } = {}) {
  const session = useSecuritySession();
  const { token, serverUrl, user } = session;
  const [tickets, setTickets] = useState<StudentTicket[]>([]);
  const [message, setMessage] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [lastFetchFailed, setLastFetchFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const ticketsRef = useRef<StudentTicket[]>([]);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  /** `silent` is the background poll: no spinner, no cache re-read, and the message line is left alone. */
  const loadTickets = useCallback(async (showRefresh = false, silent = false) => {
    if (!token || !user || user.role !== 'student') {
      setIsLoading(false);
      return;
    }

    if (silent && isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) {
      setIsRefreshing(showRefresh);
      setMessage('');
    }
    let cachedTickets: StudentTicket[] = [];

    if (silent) {
      cachedTickets = ticketsRef.current;
    } else {
      try {
        cachedTickets = await loadStudentTicketCache(serverUrl, user.id);
        setTickets(cachedTickets);
      } catch {
        cachedTickets = [];
      }
    }

    try {
      const freshTickets = await fetchStudentTickets(token);
      setTickets(freshTickets);
      setIsOffline(false);
      setLastFetchFailed(false);
      if (silent) setMessage('');
      await saveStudentTicketCache(serverUrl, user.id, freshTickets).catch(() => undefined);
    } catch (cause) {
      setLastFetchFailed(true);
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
        setMessage('This student account is no longer authorized. Sign in again to continue.');
        await session.signOut();
      } else if ((!(cause instanceof ApiError) || cause.status >= 500) && cachedTickets.length > 0) {
        setTickets(cachedTickets);
        setIsOffline(true);
        setMessage('Event server unavailable. Showing tickets securely saved on this device.');
      } else {
        setIsOffline(false);
        setMessage(cause instanceof Error ? cause.message : 'Could not load your tickets.');
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [serverUrl, session, token, user]);

  useEffect(() => {
    void Promise.resolve().then(() => loadTickets());
  }, [loadTickets]);

  const isStudent = user?.role === 'student' && Boolean(token);
  useTicketPolling({ isStudent, isPassOpen, lastFetchFailed, tickets, refreshSilently: () => void loadTickets(false, true) });

  const sortedTickets = useMemo(() => sortTicketsForDisplay(tickets), [tickets]);

  return {
    firstName: user?.name.trim().split(/\s+/)[0] || 'there',
    tickets: sortedTickets,
    message,
    isOffline,
    isLoading,
    isRefreshing,
    refresh: () => void loadTickets(true),
  };
}
