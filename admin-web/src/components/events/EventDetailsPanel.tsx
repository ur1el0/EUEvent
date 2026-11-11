import { Clock3, DoorOpen, Save } from 'lucide-react';
import { formatDate } from '../../services/eventChanges';
import { getLifecycleActions, isFinalStatus, STATUS_EXPLANATIONS } from '../../services/eventLifecycle';
import type { useEventEditor } from '../../hooks/useEventEditor';
import type { AdminEvent } from '../../types/events';
import { EventEditorDialog } from './EventEditorDialog';
import { EventStatusBadge } from './EventStatusBadge';

interface EventDetailsPanelProps {
  event: AdminEvent;
  editor: ReturnType<typeof useEventEditor>;
}

export function EventDetailsPanel({ event, editor }: EventDetailsPanelProps) {
  const { draft, setDraft } = editor;
  const isFrozen = isFinalStatus(event.status);
  const actions = getLifecycleActions(event.status);
  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="surface-card panel event-details-panel" aria-labelledby="event-detail-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Event #{event.id} · Configuration v{event.configuration_version}</span><h2 id="event-detail-title">{event.name}</h2></div>
        <EventStatusBadge status={event.status} detailed />
      </div>
      <p className="status-explainer">{STATUS_EXPLANATIONS[event.status]}</p>

      {actions.length > 0 && (
        <div className="lifecycle-bar" role="group" aria-label="Event status actions">
          {actions.map((action) => (
            <button key={action.key} type="button" disabled={editor.isDirty}
              className={action.tone === 'primary' ? 'btn btn--primary' : action.tone === 'danger' ? 'btn btn--text-danger' : 'btn btn--secondary'}
              onClick={() => editor.requestAction(action)}>
              {action.label}
            </button>
          ))}
          {editor.isDirty && <p className="lifecycle-hint">Save or discard your edits to change the status.</p>}
        </div>
      )}

      <form className="event-form event-edit-form" onSubmit={(submit) => { submit.preventDefault(); editor.requestSave(); }}>
        <label htmlFor="event-name">Event name</label>
        <input id="event-name" maxLength={150} required disabled={isFrozen} value={draft.name} onChange={(e) => set('name', e.target.value)} />
        <label htmlFor="event-starts">Starts</label>
        <input id="event-starts" type="datetime-local" required disabled={isFrozen} value={draft.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
        <label htmlFor="event-ends">Ends</label>
        <input id="event-ends" type="datetime-local" required disabled={isFrozen} value={draft.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
        <label htmlFor="event-description">Description <span>Optional</span></label>
        <textarea id="event-description" rows={3} disabled={isFrozen} value={draft.description} onChange={(e) => set('description', e.target.value)} />
        {isFrozen ? (
          <p className="event-locked-note">This event is final. Its schedule and scanner assignments are locked.</p>
        ) : (
          <div className="form-actions">
            <button className="btn btn--primary" type="submit"><Save size={16} /> Save event changes</button>
            {editor.isDirty && <button className="btn btn--secondary" type="button" onClick={editor.discard}>Discard edits</button>}
          </div>
        )}
      </form>

      <div className="event-summary">
        <span><DoorOpen size={15} />{event.venue?.name ?? 'Venue unavailable'}</span>
        <span><Clock3 size={15} />{formatDate(event.starts_at)} – {formatDate(event.ends_at)}</span>
      </div>
      <EventEditorDialog event={event} editor={editor} />
    </section>
  );
}
