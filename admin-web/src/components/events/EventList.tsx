import { CalendarDays, Clock3, Loader2 } from 'lucide-react';
import { formatDate } from '../../services/eventChanges';
import type { AdminEvent } from '../../types/events';
import { EventStatusBadge } from './EventStatusBadge';

interface EventListProps {
  events: AdminEvent[];
  selectedEventId: number | null;
  isLoading: boolean;
  onSelect: (eventId: number) => void;
}

export function EventList({ events, selectedEventId, isLoading, onSelect }: EventListProps) {
  return (
    <section className="surface-card panel event-list-panel" aria-labelledby="event-list-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Planning &amp; live events</span><h2 id="event-list-title">Event list</h2></div>
        <span className="count-pill count-pill--amber">{events.length} events</span>
      </div>
      {isLoading ? (
        <div className="event-empty-copy"><Loader2 size={18} className="spin" /> Loading events…</div>
      ) : events.length > 0 ? (
        <ul className="event-list">
          {events.map((eventItem) => (
            <li key={eventItem.id}>
              <button className={eventItem.id === selectedEventId ? 'event-list-item event-list-item--selected' : 'event-list-item'}
                type="button" aria-current={eventItem.id === selectedEventId ? 'true' : undefined} onClick={() => onSelect(eventItem.id)}>
                <span className="event-list-item__top"><strong>{eventItem.name}</strong><EventStatusBadge status={eventItem.status} /></span>
                <span className="event-list-item__venue">{eventItem.venue?.name ?? 'Venue unavailable'}</span>
                <span className="event-list-item__date"><Clock3 size={13} />{formatDate(eventItem.starts_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="event-empty-state">
          <span className="staff-empty-icon"><CalendarDays size={21} /></span>
          <strong>No events yet</strong>
          <p>Create an event to start configuring gates and scanner staff.</p>
        </div>
      )}
    </section>
  );
}
