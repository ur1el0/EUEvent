// Pure mapping from scan outcomes to the gate decision panel. No imports, so it
// runs under `node --test`; callers pass in the copy they already own.

export type ScanVerdict = 'admit' | 'deny';

export type ScanDecision = {
  verdict: ScanVerdict;
  /** One short line under ADMIT / DO NOT ADMIT. */
  reason: string;
  /** Small print for staff who need more context. */
  detail: string;
  /** For an admission: 'local' until the server confirms it, then 'server'. */
  confirmation: 'local' | 'server' | null;
  /** From the local manifest, shown only for a QR whose rotating code verified. */
  studentNumber: string | null;
  /** Queue ID of the scan this decision belongs to, if one was saved. */
  scanId: string | null;
};

export type DecisionCopy = { title: string; detail: string };

export type ServerOutcome = {
  scan_id: string;
  decision: 'accepted' | 'rejected';
  reason_code: string | null;
};

export const LOCAL_ADMIT_NOTE = 'Saved on this phone, not yet confirmed by server';
export const SERVER_ADMIT_NOTE = 'Confirmed by the event server';

export function denyDecision(copy: DecisionCopy, studentNumber: string | null = null): ScanDecision {
  return { verdict: 'deny', reason: copy.title, detail: copy.detail, confirmation: null, studentNumber, scanId: null };
}

export function localAdmitDecision(scanId: string, studentNumber: string | null): ScanDecision {
  return {
    verdict: 'admit',
    reason: 'Valid ticket for this gate',
    detail: 'The rotating code matches this gate’s saved ticket list. Offline checks cannot see later revocations, event changes, or scans at other disconnected gates. Follow the event’s offline admission procedure and send scans to the server promptly.',
    confirmation: 'local',
    studentNumber,
    scanId,
  };
}

/** Updates the shown decision when the server answers for that same scan; otherwise leaves it alone. */
export function applyServerOutcome(
  decision: ScanDecision | null,
  outcomes: readonly ServerOutcome[],
  describeRejection: (reasonCode: string | null) => string,
): ScanDecision | null {
  if (!decision?.scanId) return decision;

  const outcome = outcomes.find((candidate) => candidate.scan_id === decision.scanId);
  if (!outcome) return decision;

  if (outcome.decision === 'accepted') {
    return {
      ...decision,
      verdict: 'admit',
      reason: 'Entry confirmed',
      detail: 'The event server confirmed this ticket. The scan is recorded in the event log.',
      confirmation: 'server',
    };
  }

  return {
    ...decision,
    verdict: 'deny',
    reason: 'Server rejected this scan',
    detail: describeRejection(outcome.reason_code),
    confirmation: null,
  };
}

export function getDecisionHeadline(verdict: ScanVerdict): string {
  return verdict === 'admit' ? 'ADMIT' : 'DO NOT ADMIT';
}

export function getConfirmationNote(decision: ScanDecision): string | null {
  if (decision.verdict !== 'admit') return null;
  return decision.confirmation === 'server' ? SERVER_ADMIT_NOTE : LOCAL_ADMIT_NOTE;
}

/** One sentence a screen reader announces for the whole panel. */
export function getDecisionAnnouncement(decision: ScanDecision): string {
  const parts = [getDecisionHeadline(decision.verdict), decision.reason];
  if (decision.studentNumber) parts.push(`Student number ${decision.studentNumber}`);
  const note = getConfirmationNote(decision);
  if (note) parts.push(note);
  return `${parts.join('. ')}.`;
}
