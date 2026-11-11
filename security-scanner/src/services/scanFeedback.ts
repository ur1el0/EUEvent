import type { ScanDecision } from './scanDecision';

/** How long an ADMIT stays on screen before scanning resumes on its own. */
export const ADMIT_AUTO_RESUME_MS = 2_000;

export type DecisionHaptic = 'success' | 'error';

/**
 * Haptic for the decision now on screen. It fires when a decision appears or
 * its verdict flips (a server rejection of a shown admission), not when the
 * server merely confirms an admission that is already on screen.
 */
export function getDecisionHaptic(previous: ScanDecision | null, next: ScanDecision | null): DecisionHaptic | null {
  if (!next) return null;
  if (previous && previous.verdict === next.verdict) return null;

  return next.verdict === 'admit' ? 'success' : 'error';
}

/**
 * The scan whose admission should auto-resume, or null to wait for "Scan next".
 * Only ADMIT auto-resumes; a tap holds that scan's result on screen.
 */
export function getAutoResumeScanId(decision: ScanDecision | null, heldScanId: string | null): string | null {
  if (decision?.verdict !== 'admit' || !decision.scanId) return null;

  return decision.scanId === heldScanId ? null : decision.scanId;
}
