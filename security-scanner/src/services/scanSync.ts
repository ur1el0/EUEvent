import { apiRequest } from './apiClient';
import {
  getScannerDeviceId,
  loadPendingScans,
  markScansSynced,
  type ServerScanOutcome,
} from './offlineScanQueue';
import { validateSyncResponse } from './scanSyncContract';

const BATCH_SIZE = 50;

export type ScanSyncSummary = {
  accepted: number;
  rejected: number;
  reasons: string[];
  outcomes: ServerScanOutcome[];
};

export async function syncPendingScans(
  token: string,
  serverUrl: string,
  staffId: number,
): Promise<ScanSyncSummary> {
  const deviceId = await getScannerDeviceId();
  const summary: ScanSyncSummary = { accepted: 0, rejected: 0, reasons: [], outcomes: [] };

  while (true) {
    const pending = await loadPendingScans(serverUrl, staffId);
    if (pending.length === 0) return summary;

    const batch = pending.slice(0, BATCH_SIZE);
    const response = await apiRequest<unknown>('/sync/batch', {
      method: 'POST',
      token,
      baseUrl: serverUrl,
      body: { device_id: deviceId, scans: batch },
    });
    const outcomes = validateSyncResponse(response, batch);
    await markScansSynced(serverUrl, staffId, outcomes);
    summary.outcomes.push(...outcomes);

    for (const outcome of outcomes) {
      if (outcome.decision === 'accepted') {
        summary.accepted++;
      } else {
        summary.rejected++;
        if (outcome.reason_code && !summary.reasons.includes(outcome.reason_code)) {
          summary.reasons.push(outcome.reason_code);
        }
      }
    }
  }
}
