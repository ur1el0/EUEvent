import type { GateManifest } from './gateManifest';

// Proposed thresholds from ADR 014, pending team approval. Every age is
// measured with this scanner's own clock (no network time source).
export const STALE_WARNING_HOURS = 6;
export const MAX_MANIFEST_AGE_HOURS = 24;
export const POST_EVENT_GRACE_MINUTES = 60;
// A download time further than this in the future means the phone clock moved back.
export const CLOCK_ROLLBACK_TOLERANCE_MINUTES = 5;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export type ManifestFreshnessSnapshot = {
  downloadedAt: string;
  manifest: Pick<GateManifest, 'event_ends_at'>;
};

export type ManifestFreshness =
  | { decision: 'fresh' }
  | { decision: 'warn'; reason: 'downloaded_long_ago' | 'missing_event_window' }
  | { decision: 'refuse'; reason: 'unknown_download_time' | 'manifest_too_old' | 'event_ended' };

export type ManifestFreshnessCopy = { title: string; detail: string };

export function evaluateManifestFreshness(
  snapshot: ManifestFreshnessSnapshot,
  nowMs: number,
): ManifestFreshness {
  const downloadedAtMs = Date.parse(snapshot.downloadedAt);
  if (Number.isNaN(downloadedAtMs)) {
    return { decision: 'refuse', reason: 'unknown_download_time' };
  }

  const ageMs = nowMs - downloadedAtMs;
  if (ageMs < -CLOCK_ROLLBACK_TOLERANCE_MINUTES * MINUTE_MS) {
    return { decision: 'refuse', reason: 'unknown_download_time' };
  }
  if (ageMs > MAX_MANIFEST_AGE_HOURS * HOUR_MS) {
    return { decision: 'refuse', reason: 'manifest_too_old' };
  }

  const eventEndsAtMs = typeof snapshot.manifest.event_ends_at === 'string'
    ? Date.parse(snapshot.manifest.event_ends_at)
    : Number.NaN;
  if (!Number.isNaN(eventEndsAtMs) && nowMs > eventEndsAtMs + POST_EVENT_GRACE_MINUTES * MINUTE_MS) {
    return { decision: 'refuse', reason: 'event_ended' };
  }

  // Manifests saved before the event window existed keep working but are always stale.
  if (Number.isNaN(eventEndsAtMs)) {
    return { decision: 'warn', reason: 'missing_event_window' };
  }
  if (ageMs > STALE_WARNING_HOURS * HOUR_MS) {
    return { decision: 'warn', reason: 'downloaded_long_ago' };
  }

  return { decision: 'fresh' };
}

const REFRESH_STEP = 'Close the scanner and tap Update ticket list on this gate while the phone is connected.';

const freshnessCopy: Record<Exclude<ManifestFreshness, { decision: 'fresh' }>['reason'], ManifestFreshnessCopy> = {
  downloaded_long_ago: {
    title: 'Ticket list may be outdated, update when connected',
    detail: `This gate’s ticket list was downloaded more than ${STALE_WARNING_HOURS} hours ago. It may miss later ticket revocations or event changes. ${REFRESH_STEP}`,
  },
  missing_event_window: {
    title: 'Ticket list may be outdated, update when connected',
    detail: `This ticket list was saved by an older app version and has no event end time, so it is treated as outdated. ${REFRESH_STEP}`,
  },
  unknown_download_time: {
    title: 'Scanning paused · ticket list age unknown',
    detail: 'This phone cannot confirm when the ticket list was downloaded; the date or time may have changed. Do not admit from this ticket list. Set the phone to automatic date and time, update the ticket list while connected, or ask the event lead.',
  },
  manifest_too_old: {
    title: 'Scanning paused · ticket list too old',
    detail: `This gate’s ticket list was downloaded more than ${MAX_MANIFEST_AGE_HOURS} hours ago. Do not admit from it. Update the ticket list while connected, or ask the event lead.`,
  },
  event_ended: {
    title: 'Scanning paused · event window ended',
    detail: `This phone’s clock is more than ${POST_EVENT_GRACE_MINUTES} minutes past the event’s scheduled end. Do not admit from this ticket list. Update the ticket list while connected, or ask the event lead.`,
  },
};

export function getManifestFreshnessCopy(
  freshness: Exclude<ManifestFreshness, { decision: 'fresh' }>,
): ManifestFreshnessCopy {
  return freshnessCopy[freshness.reason];
}
