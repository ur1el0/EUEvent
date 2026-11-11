import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '../services/apiClient';
import { fetchAssignedGates, type AssignedGate } from '../services/assignedGates';
import { fetchGateManifest } from '../services/gateManifest';
import {
  clearOfflineGateManifests,
  loadOfflineGateManifests,
  saveOfflineGateManifest,
  summarizeOfflineGateManifest,
  type CachedManifestSummary,
  type OfflineGateManifest,
} from '../services/offlineManifestStore';

type GateAssignmentsOptions = {
  token: string | null;
  staffId: number | undefined;
  serverUrl: string;
  endSession: () => Promise<void>;
  /** Called after every load, with `true` so queued scans are uploaded when possible. */
  refreshQueue: (attemptSync?: boolean) => Promise<void>;
};

/** Assigned gates plus the ticket lists (manifests) saved on this phone, with offline fallback. */
export function useGateAssignments({ token, staffId, serverUrl, endSession, refreshQueue }: GateAssignmentsOptions) {
  const [assignments, setAssignments] = useState<AssignedGate[]>([]);
  const [cachedManifests, setCachedManifests] = useState<Record<number, CachedManifestSummary>>({});
  const [offlineManifests, setOfflineManifests] = useState<Record<number, OfflineGateManifest>>({});
  const [message, setMessage] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingGateId, setDownloadingGateId] = useState<number | null>(null);

  const loadAssignments = useCallback(async (showRefresh = false) => {
    if (!token || !staffId) return;
    setIsRefreshing(showRefresh);
    setMessage('');
    let savedManifests: Awaited<ReturnType<typeof loadOfflineGateManifests>> = [];

    try {
      savedManifests = await loadOfflineGateManifests(serverUrl, staffId);
      setOfflineManifests(Object.fromEntries(savedManifests.map((snapshot) => [snapshot.assignment.gate_id, snapshot])));
      setCachedManifests(Object.fromEntries(savedManifests.map((snapshot) => [
        snapshot.assignment.gate_id,
        summarizeOfflineGateManifest(snapshot),
      ])));
      if (savedManifests.length > 0) {
        setAssignments(savedManifests.map((snapshot) => snapshot.assignment));
        setIsLoading(false);
      }
    } catch {
      setCachedManifests({});
      setOfflineManifests({});
    }

    try {
      setAssignments(await fetchAssignedGates(token));
      setIsOffline(false);
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
        setMessage('This staff account is no longer authorized. Sign in again to load current assignments.');
        await endSession();
      } else if ((!(cause instanceof ApiError) || cause.status >= 500) && savedManifests.length > 0) {
        setAssignments(savedManifests.map((snapshot) => snapshot.assignment));
        setIsOffline(true);
        setMessage('Event server unavailable. Showing this device’s last downloaded gate manifests.');
      } else {
        setIsOffline(false);
        setMessage(cause instanceof Error ? cause.message : 'Could not load gate assignments.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      void refreshQueue(true);
    }
  }, [endSession, refreshQueue, serverUrl, staffId, token]);

  useEffect(() => {
    void Promise.resolve().then(() => loadAssignments());
  }, [loadAssignments]);

  async function downloadManifest(assignment: AssignedGate) {
    if (!token || !staffId || isOffline) return;
    setDownloadingGateId(assignment.gate_id);
    try {
      const manifest = await fetchGateManifest(token, assignment.gate_id);
      const snapshot = await saveOfflineGateManifest(serverUrl, staffId, assignment, manifest);
      setOfflineManifests((current) => ({ ...current, [assignment.gate_id]: snapshot }));
      setCachedManifests((current) => ({
        ...current,
        [assignment.gate_id]: summarizeOfflineGateManifest(snapshot),
      }));
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
        await endSession();
      } else {
        Alert.alert(
          'Manifest not saved',
          cause instanceof Error ? cause.message : 'Could not download this gate manifest.',
        );
      }
    } finally {
      setDownloadingGateId(null);
    }
  }

  function confirmClearManifests() {
    Alert.alert(
      'Clear offline manifests?',
      'This removes the encrypted ticket data saved on this phone. Download the manifests again before the event.',
      [
        { text: 'Keep manifests', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void clearOfflineGateManifests()
              .then(() => {
                setCachedManifests({});
                setOfflineManifests({});
              })
              .catch(() => Alert.alert('Could not clear manifests', 'Please try again.'));
          },
        },
      ],
    );
  }

  return {
    assignments,
    cachedManifests,
    offlineManifests,
    message,
    isOffline,
    isLoading,
    isRefreshing,
    downloadingGateId,
    refresh: () => void loadAssignments(true),
    downloadManifest: (assignment: AssignedGate) => void downloadManifest(assignment),
    confirmClearManifests,
  };
}
