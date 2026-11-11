import { AlertCircle, CalendarDays, Check, Plus } from 'lucide-react';
import { useEventList } from '../hooks/useEventList';
import { useFlashMessages } from '../hooks/useFlashMessages';
import { useNewEvent } from '../hooks/useNewEvent';
import type { EventOptionsState } from '../hooks/useEventOptions';
import { EventDetail } from './events/EventDetail';
import { EventList } from './events/EventList';
import { NewEventForm } from './events/NewEventForm';

interface AdminEventManagementProps {
  token: string;
  options: EventOptionsState;
}

export function AdminEventManagement({ token, options }: AdminEventManagementProps) {
  const flash = useFlashMessages();
  const list = useEventList(token);
  const newEvent = useNewEvent(token, options.venues, flash, list.addEvent, list.replaceEvent);
  const { selectedEvent } = list;
  const loadError = flash.error ?? list.error ?? options.error;

  return (
    <section className="event-view" aria-labelledby="events-page-title">
      <header className="dashboard-header event-page-header">
        <div>
          <p className="eyebrow">VENUE OPERATIONS</p>
          <h1 id="events-page-title">Events &amp; gates</h1>
          <p className="dashboard-subtitle">Create an event, select its venue gates, and grant scanner access to staff.</p>
        </div>
        <button className="btn btn--primary" type="button" aria-expanded={newEvent.isOpen}
          onClick={() => { newEvent.toggle(); void options.refresh(); }}>
          <Plus size={17} /> {newEvent.isOpen ? 'Close form' : 'New event'}
        </button>
      </header>

      {loadError && <div className="notice notice--error" role="alert"><AlertCircle size={18} /><span>{loadError}</span></div>}
      {flash.notice && <div className="notice notice--success" role="status"><Check size={18} /><span>{flash.notice}</span></div>}

      {newEvent.isOpen && <NewEventForm form={newEvent} venues={options.venues} />}

      <div className="events-layout">
        <EventList events={list.events} selectedEventId={list.selectedEventId} isLoading={list.isLoading}
          onSelect={(eventId) => { list.setSelectedEventId(eventId); flash.clear(); }} />
        {selectedEvent ? (
          <EventDetail token={token} event={selectedEvent} venues={options.venues} securityStaff={options.securityStaff}
            flash={flash} replaceEvent={list.replaceEvent} patchEvent={list.patchEvent} />
        ) : (
          <section className="surface-card event-no-selection">
            <span className="staff-empty-icon"><CalendarDays size={21} /></span>
            <strong>{list.isLoading ? 'Loading event details' : 'Select an event'}</strong>
            <p>{list.isLoading ? 'The event list is being fetched.' : 'Choose an event or create one to configure its schedule and gates.'}</p>
          </section>
        )}
      </div>
    </section>
  );
}
