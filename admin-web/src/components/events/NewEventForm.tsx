import { CalendarDays, CalendarCheck, Loader2, Plus } from 'lucide-react';
import type { useNewEvent } from '../../hooks/useNewEvent';
import type { Venue } from '../../types/venues';
import { EventStatusBadge } from './EventStatusBadge';

interface NewEventFormProps {
  form: ReturnType<typeof useNewEvent>;
  venues: Venue[];
}

export function NewEventForm({ form, venues }: NewEventFormProps) {
  const { draft, setField, isCreating } = form;

  return (
    <section className="surface-card panel event-create-panel" aria-labelledby="create-event-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Event setup</span><h2 id="create-event-title">New event</h2></div>
        <span className="panel-icon"><CalendarDays size={19} /></span>
      </div>
      {venues.length === 0 ? (
        <p className="event-empty-copy">No venues are configured yet. Add a venue with at least one gate in the Venues workspace before creating an event.</p>
      ) : (
        <form className="event-form event-create-form" onSubmit={form.submitDraft}>
          <label htmlFor="new-event-name">Event name</label>
          <input id="new-event-name" maxLength={150} required value={draft.name} onChange={(event) => setField('name', event.target.value)} />
          <label htmlFor="new-event-venue">Venue</label>
          <select id="new-event-venue" required value={draft.venueId} onChange={(event) => setField('venueId', event.target.value)}>
            {venues.map((venue) => <option value={venue.id} key={venue.id}>{venue.name}</option>)}
          </select>
          <label htmlFor="new-event-starts">Starts</label>
          <input id="new-event-starts" type="datetime-local" required value={draft.startsAt} onChange={(event) => setField('startsAt', event.target.value)} />
          <label htmlFor="new-event-ends">Ends</label>
          <input id="new-event-ends" type="datetime-local" required value={draft.endsAt} onChange={(event) => setField('endsAt', event.target.value)} />
          <label htmlFor="new-event-description">Description <span>Optional</span></label>
          <textarea id="new-event-description" rows={3} value={draft.description} onChange={(event) => setField('description', event.target.value)} />
          <div className="form-actions">
            <button className="btn btn--primary" type="submit" disabled={isCreating}>
              {isCreating ? <><Loader2 size={16} className="spin" /> Creating…</> : <><Plus size={16} /> Create event</>}
            </button>
            <button className="btn btn--secondary" type="button" disabled={isCreating || !form.canSubmit} onClick={form.submitAndSchedule}>
              <CalendarCheck size={16} /> Create and schedule
            </button>
          </div>
          <p className="status-explainer" style={{ gridColumn: '1 / -1' }}>
            <EventStatusBadge status="draft" detailed /> A new event starts as a draft. Gate staff can't download a ticket list until the event is scheduled.
          </p>
        </form>
      )}
    </section>
  );
}
