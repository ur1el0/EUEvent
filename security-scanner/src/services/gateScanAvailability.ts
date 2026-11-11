// Pure rule for the Scan button on a gate card. Type imports only, so it runs under `node --test`.
import type { AssignedGate } from './assignedGates';

export type GateScanState = {
  canScan: boolean;
  /** One short line explaining why Scan is disabled, or null when it is enabled. */
  reason: string | null;
  /** The saved ticket list is older than the server's current version for this gate. */
  isListOutOfDate: boolean;
};

/**
 * Same rule as before the redesign: scanning needs an open event and a saved ticket
 * list. An out-of-date list blocks scanning while online (update it first) but not
 * while offline, where the saved copy is all the phone has.
 */
export function getGateScanState(
  assignment: Pick<AssignedGate, 'event_status' | 'manifest_version'>,
  savedListVersion: number | undefined,
  isOffline: boolean,
): GateScanState {
  const hasList = savedListVersion !== undefined;
  const isListOutOfDate = hasList && savedListVersion !== assignment.manifest_version;
  const isEventOpen = assignment.event_status === 'scheduled' || assignment.event_status === 'in_progress';

  if (!isEventOpen) return { canScan: false, reason: 'Event not open', isListOutOfDate };
  if (!hasList) return { canScan: false, reason: 'No ticket list saved yet', isListOutOfDate };
  if (isListOutOfDate && !isOffline) return { canScan: false, reason: 'Ticket list out of date, update it', isListOutOfDate };

  return { canScan: true, reason: null, isListOutOfDate };
}
