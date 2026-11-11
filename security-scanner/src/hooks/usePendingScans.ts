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
              ? `${summary.accepted} accepted · ${summary.rejected} rejected by the server (${summary.reasons.join(', ')})`
              : `${summary.accepted} saved ${summary.accepted === 1 ? 'scan' : 'scans'} sent to the server`);
          }
        } catch {
          setSyncMessage('Could not reach the server. Scans stay saved on this phone; try again when connected.');
        } finally {
          setIsSyncingScans(false);
        }
      }
    } catch (cause) {
      setSyncMessage(cause instanceof Error ? cause.message : 'Could not read the scans saved on this phone.');
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
