import type { EventStatus } from '../types/events';

// Transition table from docs/api.md: PATCH /api/v1/admin/events/{event}.

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

/** Badge text that says what the status means for entry, so it never depends on colour alone. */
export const STATUS_BADGE_TEXT: Record<EventStatus, string> = {
  draft: 'DRAFT - not open for entry',
  scheduled: 'SCHEDULED - ticket lists available',
  in_progress: 'IN PROGRESS - entry is open',
  postponed: 'POSTPONED - entry is closed',
  cancelled: 'CANCELLED - final',
  completed: 'COMPLETED - final',
};

export const STATUS_EXPLANATIONS: Record<EventStatus, string> = {
  draft: "Gate staff can't download a ticket list until the event is scheduled.",
  scheduled: 'Gate staff can download their ticket lists. Phones that already did only see later changes after they sync.',
  in_progress: 'Entry is open. Phones with a saved ticket list only see changes after they sync.',
  postponed: 'Ticket lists are not available while the event is postponed. Schedule it again when the new time is set.',
  cancelled: 'This event is final. Its schedule and gate access are locked.',
  completed: 'This event is final. Its schedule and gate access are locked.',
};

export type LifecycleTone = 'primary' | 'secondary' | 'danger';

export interface LifecycleAction {
  key: string;
  label: string;
  to: EventStatus;
  tone: LifecycleTone;
  /** The API requires a reason for this transition. */
  needsReason: boolean;
  dialogTitle: string;
  dialogBody: string;
  confirmLabel: string;
}

const OFFLINE_NOTE = 'Phones that already saved a ticket list will not see this until they sync.';

const SCHEDULE: LifecycleAction = {
  key: 'schedule', label: 'Schedule event', to: 'scheduled', tone: 'primary', needsReason: false,
  dialogTitle: 'Schedule this event?',
  dialogBody: 'Gate staff will be able to download ticket lists for the assigned gates.',
  confirmLabel: 'Schedule event',
};
const RESCHEDULE: LifecycleAction = {
  ...SCHEDULE, key: 'reschedule', label: 'Schedule again', needsReason: true,
  dialogTitle: 'Schedule this postponed event again?',
  dialogBody: 'Ticket lists become available again. Check the new date and time first. ' + OFFLINE_NOTE,
  confirmLabel: 'Schedule event',
};
const START: LifecycleAction = {
  key: 'start', label: 'Start event', to: 'in_progress', tone: 'primary', needsReason: false,
  dialogTitle: 'Start this event?',
  dialogBody: 'The event is marked in progress and entry is considered open. ' + OFFLINE_NOTE,
  confirmLabel: 'Start event',
};
const COMPLETE: LifecycleAction = {
  key: 'complete', label: 'Mark completed', to: 'completed', tone: 'primary', needsReason: false,
  dialogTitle: 'Mark this event completed?',
  dialogBody: 'Completed is final. The schedule and gate access can no longer be changed.',
  confirmLabel: 'Mark completed',
};
const POSTPONE: LifecycleAction = {
  key: 'postpone', label: 'Postpone', to: 'postponed', tone: 'secondary', needsReason: true,
  dialogTitle: 'Postpone this event?',
  dialogBody: 'Entry is closed and ticket lists are no longer available. ' + OFFLINE_NOTE,
  confirmLabel: 'Postpone event',
};
const CANCEL: LifecycleAction = {
  key: 'cancel', label: 'Cancel event', to: 'cancelled', tone: 'danger', needsReason: true,
  dialogTitle: 'Cancel this event?',
  dialogBody: 'Cancelled is final and cannot be undone. Scans uploaded later for this event are rejected. ' + OFFLINE_NOTE,
  confirmLabel: 'Cancel event',
};

const ACTIONS_BY_STATUS: Record<EventStatus, LifecycleAction[]> = {
  draft: [SCHEDULE, CANCEL],
  scheduled: [START, POSTPONE, CANCEL],
  in_progress: [COMPLETE, POSTPONE, CANCEL],
  postponed: [RESCHEDULE, CANCEL],
  cancelled: [],
  completed: [],
};

/** Only the actions that are valid for the event's current status. */
export function getLifecycleActions(status: EventStatus): LifecycleAction[] {
  return ACTIONS_BY_STATUS[status];
}

export function isFinalStatus(status: EventStatus): boolean {
  return status === 'cancelled' || status === 'completed';
}

/** Rescheduling anything that is not a draft needs a reason. */
export function isReasonRequiredForEdit(status: EventStatus, scheduleChanged: boolean): boolean {
  return scheduleChanged && status !== 'draft';
}

/** Saving edits on these statuses can reach phones that already downloaded a ticket list. */
export function affectsDownloadedTicketLists(status: EventStatus): boolean {
  return status === 'scheduled' || status === 'in_progress';
}
