import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSecuritySession } from './useSecuritySession';
import { ApiError } from '../services/apiClient';
import { fetchStudentTickets, type StudentTicket } from '../services/studentTickets';
import { loadStudentTicketCache, saveStudentTicketCache } from '../services/studentTicketStorage';
import { sortTicketsForDisplay } from '../services/ticketStatus';

/** Loads the student's tickets, falling back to the encrypted copy on this phone when offline. */
export function useStudentTickets() {
  const session = useSecuritySession();
  const { token, serverUrl, user } = session;
  const [tickets, setTickets] = useState<StudentTicket[]>([]);
  const [message, setMessage] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const loadTickets = useCallback(async (showRefresh = false) => {
    if (!token || !user || user.role !== 'student') {
      setIsLoading(false);
      return;
    }

    setIsRefreshing(showRefresh);
    setMessage('');
    let cachedTickets: StudentTicket[] = [];

    try {
      cachedTickets = await loadStudentTicketCache(serverUrl, user.id);
      setTickets(cachedTickets);
    } catch {
      cachedTickets = [];
    }

    try {
      const freshTickets = await fetchStudentTickets(token);
      setTickets(freshTickets);
      setIsOffline(false);
      await saveStudentTicketCache(serverUrl, user.id, freshTickets).catch(() => undefined);
    } catch (cause) {
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
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [serverUrl, session, token, user]);

  useEffect(() => {
    void Promise.resolve().then(() => loadTickets());
  }, [loadTickets]);

  async function signOut() {
    setIsSigningOut(true);
    await session.signOut();
    setIsSigningOut(false);
  }

  const sortedTickets = useMemo(() => sortTicketsForDisplay(tickets), [tickets]);

  return {
    firstName: user?.name.trim().split(/\s+/)[0] || 'there',
    tickets: sortedTickets,
    message,
    isOffline,
    isLoading,
    isRefreshing,
    isSigningOut,
    refresh: () => void loadTickets(true),
    signOut: () => void signOut(),
  };
}
