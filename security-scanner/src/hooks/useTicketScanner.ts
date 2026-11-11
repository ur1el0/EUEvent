import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { useSyncQueue } from './useSyncQueue';
import type { AssignedGate } from '../services/assignedGates';
import { evaluateManifestFreshness, getManifestFreshnessCopy } from '../services/manifestFreshness';
import type { OfflineGateManifest } from '../services/offlineManifestStore';
import { hasScannedTicket, savePendingScan, type PendingScan, type ServerScanOutcome } from '../services/offlineScanQueue';
import { serverReason } from '../services/serverScanReasons';
import { getTicketRejectionCopy } from '../services/ticketRejectionCopy';
import { validateTicketQr } from '../services/ticketValidation';

export type ScanResult = { tone: 'success' | 'error' | 'neutral'; title: string; detail: string };

type TicketScannerOptions = {
  visible: boolean;
  assignment: AssignedGate;
  snapshot: OfflineGateManifest;
  serverUrl: string;
  staffId: number;
  token: string;
  onQueueChanged: () => void;
};

const ALREADY_SCANNED: ScanResult = {
  tone: 'error',
  title: 'Ticket already scanned',
  detail: 'This device has already recorded this ticket. Do not admit it again.',
};

/** Camera access, QR evaluation, local queueing, and the result shown for the current scan. */
export function useTicketScanner({ visible, assignment, snapshot, serverUrl, staffId, token, onQueueChanged }: TicketScannerOptions) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const scanLock = useRef(false);
  const activeScanId = useRef<string | null>(null);

  const applyServerOutcomes = useCallback((outcomes: ServerScanOutcome[]) => {
    const displayedScanId = activeScanId.current;
    const scanOutcome = displayedScanId
      ? outcomes.find((outcome) => outcome.scan_id === displayedScanId)
      : undefined;
    if (displayedScanId && scanOutcome?.decision === 'accepted') {
      setResult({ tone: 'success', title: 'Entry accepted · synced', detail: 'The event server confirmed this ticket. The scan is recorded in the event log.' });
    } else if (displayedScanId && scanOutcome?.decision === 'rejected') {
      setResult({ tone: 'error', title: 'Server rejected this scan', detail: serverReason(scanOutcome.reason_code) });
    }
  }, []);

  const sync = useSyncQueue({ visible, token, serverUrl, staffId, onQueueChanged, onOutcomes: applyServerOutcomes });

  async function handleBarcode({ data }: { data: string }) {
    if (!visible || !isScanning || scanLock.current) return;
    scanLock.current = true;
    setIsScanning(false);
    setIsProcessing(true);
    setResult(null);

    try {
      const freshness = evaluateManifestFreshness(snapshot, Date.now());
      if (freshness.decision === 'refuse') {
        setResult({ tone: 'error', ...getManifestFreshnessCopy(freshness) });
        return;
      }

      const check = await validateTicketQr(data, snapshot.manifest, assignment.gate_id);
      if (!check.valid) {
        setResult({ tone: 'error', ...getTicketRejectionCopy(check.reason) });
        return;
      }

      const alreadyScanned = await hasScannedTicket(serverUrl, staffId, check.ticket.ticket_id);
      if (alreadyScanned) {
        setResult(ALREADY_SCANNED);
        return;
      }

      const scan: PendingScan = {
        scan_id: Crypto.randomUUID(),
        ticket_id: check.ticket.ticket_id,
        gate_id: assignment.gate_id,
        scanned_at: Date.now(),
        is_override: false,
        event_configuration_version: snapshot.manifest.manifest_version,
        code_step: check.timeStep,
        code: check.code,
      };
      const saved = await savePendingScan(serverUrl, staffId, scan);
      if (!saved) {
        setResult(ALREADY_SCANNED);
        return;
      }

      onQueueChanged();
      activeScanId.current = scan.scan_id;
      sync.setSyncStatus('Saved on this phone. Server confirmation can happen in the background.');
      setResult({ tone: 'success', title: 'Locally validated · saved on device', detail: 'The rotating code matches this saved gate manifest. This is not server confirmation; offline checks cannot see later revocations, event changes, or scans at other disconnected gates. Follow the event’s offline admission procedure and sync promptly.' });
      if (token) {
        sync.requestSync();
      }
    } catch (cause) {
      setResult({
        tone: 'error',
        title: 'Could not record scan',
        detail: cause instanceof Error ? cause.message : 'Check the encrypted device storage and try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function scanNext() {
    scanLock.current = false;
    activeScanId.current = null;
    setResult(null);
    setIsScanning(true);
  }

  const cameraCanBeRequested = permission?.canAskAgain !== false;

  return {
    camera: {
      isChecking: permission === null,
      isAllowed: permission?.granted === true,
      canBeRequested: cameraCanBeRequested,
      request: () => (cameraCanBeRequested ? void requestPermission() : void Linking.openSettings()),
    },
    isScanning,
    isProcessing,
    result,
    handleBarcode,
    scanNext,
    isSyncing: sync.isSyncing,
    syncStatus: sync.syncStatus,
    syncIssue: sync.syncIssue,
  };
}
