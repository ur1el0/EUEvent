import { useCallback, useState } from 'react';
import { countPendingScans } from '../services/offlineScanQueue';
import { syncPendingScans } from '../services/scanSync';

/**
 * Counts this staff account's queued scans and, when asked, uploads them once.
 * Unlike the gate scanner's useSyncQueue there is no background retry or back-off,
 * so a manual tap always tries again immediately.
 */
export function usePendingScans(serverUrl: string, staffId: number | undefined, token: string | null) {
  const [pendingScansCount, setPendingScansCount] = useState(0);
  const [isSyncingScans, setIsSyncingScans] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const refreshQueue = useCallback(async (attemptSync = false) => {
    if (!staffId) {
      setPendingScansCount(0);
      return;
    }

    try {
      let pendingCount = await countPendingScans(serverUrl, staffId);
      setPendingScansCount(pendingCount);
      if (attemptSync && pendingCount > 0 && token) {
        setIsSyncingScans(true);
        setSyncMessage('');
        try {
          const summary = await syncPendingScans(token, serverUrl, staffId);
          pendingCount = await countPendingScans(serverUrl, staffId);
          setPendingScansCount(pendingCount);
          if (summary.accepted || summary.rejected) {
            setSyncMessage(summary.rejected
              ? `${summary.accepted} accepted · ${summary.rejected} rejected (${summary.reasons.join(', ')})`
              : `${summary.accepted} offline ${summary.accepted === 1 ? 'scan' : 'scans'} synchronized`);
          }
        } catch {
          setSyncMessage('Scans remain encrypted on this device and will retry when the server is reachable.');
        } finally {
          setIsSyncingScans(false);
        }
      }
    } catch (cause) {
      setSyncMessage(cause instanceof Error ? cause.message : 'Could not read the local scan queue.');
    }
  }, [serverUrl, staffId, token]);

  const handleQueueChanged = useCallback(() => {
    void refreshQueue(false);
  }, [refreshQueue]);

  return {
    pendingScansCount,
    isSyncingScans,
    syncMessage,
    refreshQueue,
    syncNow: () => void refreshQueue(true),
    handleQueueChanged,
  };
}
