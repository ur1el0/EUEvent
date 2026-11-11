import { useEffect, useState } from 'react';
import {
  evaluateManifestFreshness,
  type ManifestFreshness,
  type ManifestFreshnessSnapshot,
} from '../services/manifestFreshness';

const RECHECK_INTERVAL_MS = 60_000;

/** Freshness of the saved manifest for display, re-evaluated every minute with the phone clock. */
export function useManifestFreshness(snapshot: ManifestFreshnessSnapshot): ManifestFreshness {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), RECHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return evaluateManifestFreshness(snapshot, nowMs);
}
