import type { PendingScan, ServerScanOutcome } from './offlineScanQueue';

type SyncResponse = {
  acknowledged_scan_ids: string[];
  outcomes: ServerScanOutcome[];
};

export function validateSyncResponse(value: unknown, batch: PendingScan[]): ServerScanOutcome[] {
  if (typeof value !== 'object' || value === null) {
    throw new Error('The event server returned an invalid result for the sent scans. Scans remain saved on this device.');
  }

  const payload = value as Partial<SyncResponse>;
  if (!Array.isArray(payload.acknowledged_scan_ids) || !Array.isArray(payload.outcomes)) {
    throw new Error('The event server did not return scan decisions. Scans remain saved on this device.');
  }

  const expectedIds = new Set(batch.map((scan) => scan.scan_id));
  const acknowledgedIds = new Set(payload.acknowledged_scan_ids.filter((id): id is string => typeof id === 'string'));
  if (acknowledgedIds.size !== batch.length || batch.some((scan) => !acknowledgedIds.has(scan.scan_id))) {
    throw new Error('The event server acknowledged an incomplete scan batch. Scans remain saved on this device.');
  }

  const outcomes = payload.outcomes as unknown[];
  if (outcomes.length !== batch.length) {
    throw new Error('The event server returned an incomplete scan result. Scans remain saved on this device.');
  }

  const byId = new Map<string, ServerScanOutcome>();
  for (const value of outcomes) {
    if (typeof value !== 'object' || value === null) {
      throw new Error('The event server returned an invalid scan decision. Scans remain saved on this device.');
    }
    const outcome = value as Partial<ServerScanOutcome>;
    if (typeof outcome.scan_id !== 'string'
      || !expectedIds.has(outcome.scan_id)
      || (outcome.decision !== 'accepted' && outcome.decision !== 'rejected')
      || !(typeof outcome.reason_code === 'string' || outcome.reason_code === null)) {
      throw new Error('The event server returned an invalid scan decision. Scans remain saved on this device.');
    }
    byId.set(outcome.scan_id, outcome as ServerScanOutcome);
  }
  if (byId.size !== batch.length) {
    throw new Error('The event server returned duplicate scan decisions. Scans remain saved on this device.');
  }

  return batch.map((scan) => byId.get(scan.scan_id)!);
}
