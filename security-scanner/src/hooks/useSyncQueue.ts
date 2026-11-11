import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServerScanOutcome } from '../services/offlineScanQueue';
import { syncPendingScans } from '../services/scanSync';
import { serverReason } from '../services/serverScanReasons';

const RETRY_INTERVAL_MS = 15_000;
const BACKOFF_AFTER_FAILURE_MS = 30_000;

type SyncQueueOptions = {
  visible: boolean;
  token: string;
  serverUrl: string;
  staffId: number;
  onQueueChanged: () => void;
  /** Receives every server outcome from a successful sync. */
  onOutcomes: (outcomes: ServerScanOutcome[]) => void;
};

/** Uploads queued scans while the gate scanner is open, retrying in the background. */
export function useSyncQueue({ visible, token, serverUrl, staffId, onQueueChanged, onOutcomes }: SyncQueueOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncIssue, setSyncIssue] = useState('');
  const syncInFlight = useRef(false);
  const syncRequested = useRef(false);
  const retryAfter = useRef(0);
  const requestSyncRef = useRef<() => void>(() => undefined);

  const requestSync = useCallback(() => {
    if (!token || Date.now() < retryAfter.current) return;
    if (syncInFlight.current) {
      syncRequested.current = true;
      return;
    }

    syncInFlight.current = true;
    syncRequested.current = false;
    setIsSyncing(true);

    void syncPendingScans(token, serverUrl, staffId)
      .then((summary) => {
        retryAfter.current = 0;
        onQueueChanged();

        const rejectedOutcomes = summary.outcomes.filter((outcome) => outcome.decision === 'rejected');
        if (rejectedOutcomes.length > 0) {
          const reason = serverReason(rejectedOutcomes[0].reason_code);
          setSyncIssue(`${rejectedOutcomes.length} queued ${rejectedOutcomes.length === 1 ? 'scan was' : 'scans were'} rejected after sync. ${reason} Ask the event lead to review entry.`);
          setSyncStatus(`${summary.accepted} accepted · ${summary.rejected} rejected after sync`);
        } else if (summary.accepted > 0) {
          setSyncIssue('');
          setSyncStatus(`${summary.accepted} ${summary.accepted === 1 ? 'scan' : 'scans'} confirmed by the event server.`);
        }

        onOutcomes(summary.outcomes);
      })
      .catch(() => {
        retryAfter.current = Date.now() + BACKOFF_AFTER_FAILURE_MS;
        syncRequested.current = false;
        setSyncStatus('Server unavailable. Scans stay saved on this phone; scanning can continue while sync retries in the background.');
      })
      .finally(() => {
        syncInFlight.current = false;
        setIsSyncing(false);

        if (syncRequested.current && Date.now() >= retryAfter.current) {
          syncRequested.current = false;
          requestSyncRef.current();
        }
      });
  }, [onOutcomes, onQueueChanged, serverUrl, staffId, token]);

  useEffect(() => {
    requestSyncRef.current = requestSync;
  }, [requestSync]);

  useEffect(() => {
    if (!visible || !token) return;

    requestSync();
    const retryInterval = setInterval(() => requestSync(), RETRY_INTERVAL_MS);
    return () => clearInterval(retryInterval);
  }, [requestSync, token, visible]);

  return { requestSync, isSyncing, syncStatus, setSyncStatus, syncIssue };
}
