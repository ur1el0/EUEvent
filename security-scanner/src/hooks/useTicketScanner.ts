import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { useDecisionHaptics } from './useDecisionHaptics';
import { useSyncQueue } from './useSyncQueue';
import type { AssignedGate } from '../services/assignedGates';
import { evaluateManifestFreshness, getManifestFreshnessCopy } from '../services/manifestFreshness';
import type { OfflineGateManifest } from '../services/offlineManifestStore';
import { hasScannedTicket, savePendingScan, type PendingScan, type ServerScanOutcome } from '../services/offlineScanQueue';
import { applyServerOutcome, denyDecision, localAdmitDecision, type ScanDecision } from '../services/scanDecision';
import { ADMIT_AUTO_RESUME_MS, getAutoResumeScanId } from '../services/scanFeedback';
import { serverReason } from '../services/serverScanReasons';
import { getTicketRejectionCopy } from '../services/ticketRejectionCopy';
import { validateTicketQr } from '../services/ticketValidation';

type TicketScannerOptions = {
  visible: boolean;
  assignment: AssignedGate;
  snapshot: OfflineGateManifest;
  serverUrl: string;
  staffId: number;
  token: string;
  onQueueChanged: () => void;
};

const ALREADY_SCANNED = {
  title: 'Ticket already scanned',
  detail: 'This device has already recorded this ticket. Do not admit it again.',
};

/** Camera access, QR evaluation, local queueing, and the decision shown for the current scan. */
export function useTicketScanner({ visible, assignment, snapshot, serverUrl, staffId, token, onQueueChanged }: TicketScannerOptions) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [decision, setDecision] = useState<ScanDecision | null>(null);
  const [heldScanId, setHeldScanId] = useState<string | null>(null);
  const scanLock = useRef(false);

  // Only the scan currently on screen is updated; after "Scan next" its outcome shows in the sync summary.
  const applyServerOutcomes = useCallback((outcomes: ServerScanOutcome[]) => {
    setDecision((current) => applyServerOutcome(current, outcomes, serverReason));
  }, []);

  const sync = useSyncQueue({ visible, token, serverUrl, staffId, onQueueChanged, onOutcomes: applyServerOutcomes });

  async function handleBarcode({ data }: { data: string }) {
    if (!visible || !isScanning || scanLock.current) return;
    scanLock.current = true;
    setIsScanning(false);
    setIsProcessing(true);
    setDecision(null);

    try {
      const freshness = evaluateManifestFreshness(snapshot, Date.now());
      if (freshness.decision === 'refuse') {
        setDecision(denyDecision(getManifestFreshnessCopy(freshness)));
        return;
      }

      const check = await validateTicketQr(data, snapshot.manifest, assignment.gate_id);
      if (!check.valid) {
        setDecision(denyDecision(getTicketRejectionCopy(check.reason)));
        return;
      }

      const alreadyScanned = await hasScannedTicket(serverUrl, staffId, check.ticket.ticket_id);
      if (alreadyScanned) {
        setDecision(denyDecision(ALREADY_SCANNED, check.ticket.student_number));
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
        setDecision(denyDecision(ALREADY_SCANNED, check.ticket.student_number));
        return;
      }

      onQueueChanged();
      sync.setSyncStatus('Saved on this phone. It will be sent to the server in the background.');
      setDecision(localAdmitDecision(scan.scan_id, check.ticket.student_number));
      if (token) {
        sync.requestSync();
      }
    } catch (cause) {
      setDecision(denyDecision({
        title: 'Could not record scan',
        detail: cause instanceof Error ? cause.message : 'Check the phone’s storage and try again.',
      }));
    } finally {
      setIsProcessing(false);
    }
  }

  const scanNext = useCallback(() => {
    scanLock.current = false;
    setDecision(null);
    setHeldScanId(null);
    setIsScanning(true);
  }, []);

  useDecisionHaptics(decision);

  // An ADMIT resumes scanning by itself; DO NOT ADMIT waits for "Scan next" so staff can deal with the student.
  const autoResumeScanId = getAutoResumeScanId(decision, heldScanId);
  useEffect(() => {
    if (!autoResumeScanId) return;
    const timer = setTimeout(scanNext, ADMIT_AUTO_RESUME_MS);
    return () => clearTimeout(timer);
  }, [autoResumeScanId, scanNext]);

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
    decision,
    handleBarcode,
    scanNext,
    isAutoResuming: autoResumeScanId !== null,
    holdResult: () => setHeldScanId(autoResumeScanId),
    isSyncing: sync.isSyncing,
    syncStatus: sync.syncStatus,
    syncIssue: sync.syncIssue,
  };
}
