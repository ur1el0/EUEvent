import { CalendarCheck, CircleCheck, CirclePause, CircleX, PencilLine, Radio, type LucideIcon } from 'lucide-react';
import { STATUS_BADGE_TEXT, STATUS_LABELS } from '../../services/eventLifecycle';
import type { EventStatus } from '../../types/events';

const ICONS: Record<EventStatus, LucideIcon> = {
  draft: PencilLine,
  scheduled: CalendarCheck,
  in_progress: Radio,
  postponed: CirclePause,
  cancelled: CircleX,
  completed: CircleCheck,
};

interface EventStatusBadgeProps {
  status: EventStatus;
  /** Show what the status means for entry, such as "DRAFT - not open for entry". */
  detailed?: boolean;
}

/** Status as a symbol plus text, so it never relies on colour alone. */
export function EventStatusBadge({ status, detailed = false }: EventStatusBadgeProps) {
  const Icon = ICONS[status];

  return (
    <span className={`status-badge status-badge--${status}`}>
      <Icon size={13} aria-hidden="true" />
      {detailed ? STATUS_BADGE_TEXT[status] : STATUS_LABELS[status]}
    </span>
  );
}
