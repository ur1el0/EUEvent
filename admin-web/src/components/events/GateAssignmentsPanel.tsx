import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { isFinalStatus } from '../../services/eventLifecycle';
import type { useGateAssignments } from '../../hooks/useGateAssignments';
import type { SecurityStaff } from '../../types';
import type { AdminEvent } from '../../types/events';
import type { Venue } from '../../types/venues';

interface GateAssignmentsPanelProps {
  event: AdminEvent;
  venue: Venue | undefined;
  securityStaff: SecurityStaff[];
  gates: ReturnType<typeof useGateAssignments>;
}

export function GateAssignmentsPanel({ event, venue, securityStaff, gates }: GateAssignmentsPanelProps) {
  const isFrozen = isFinalStatus(event.status);
  const isDraft = event.status === 'draft';
  const venueGates = venue?.gates ?? [];

  return (
    <section className="surface-card panel gate-assignments-panel" aria-labelledby="gate-assignments-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Door access</span><h2 id="gate-assignments-title">Gate assignments</h2></div>
        <span className="panel-icon"><ShieldCheck size={19} /></span>
      </div>
      {!venue ? (
        <p className="event-empty-copy">Venue details are unavailable for this event.</p>
      ) : venueGates.length === 0 ? (
        <p className="event-empty-copy">This venue has no gates yet. Add a gate in the Venues workspace before assigning scanner access.</p>
      ) : (
        <form className="gate-assignment-form" onSubmit={gates.save}>
          {!isDraft && !isFrozen && (
            <p className="event-policy-note">Scheduled event access is protected for offline scanners. Existing gates and staff cannot be removed; additions require a reason.</p>
          )}
          <div className="gate-option-list">
            {venueGates.map((venueGate) => {
              const draft = gates.gateDraft.find((gate) => gate.venueGateId === venueGate.id);
              const existingGate = event.event_gates.find((gate) => gate.venue_gate_id === venueGate.id);
              const existingStaffIds = existingGate?.security_staff.map((person) => person.id) ?? [];
              const canRemoveGate = isDraft || !existingGate;
              return (
                <fieldset className={draft ? 'gate-option gate-option--selected' : 'gate-option'} key={venueGate.id}>
                  <legend className="visually-hidden">{venueGate.code} {venueGate.name}</legend>
                  <label className="gate-toggle">
                    <input type="checkbox" checked={Boolean(draft)} disabled={isFrozen || (!canRemoveGate && Boolean(draft))}
                      onChange={(change) => gates.toggleGate(venueGate, change.target.checked)} />
                    <span className="gate-toggle-copy"><strong>{venueGate.code}</strong><span>{venueGate.name}</span></span>
                    {existingGate && <span className="gate-existing-tag">Configured</span>}
                  </label>
                  {draft && (
                    <div className="gate-option-content">
                      <label className="capacity-label" htmlFor={'gate-capacity-' + venueGate.id}>Ticket capacity <span>Optional</span></label>
                      <input id={'gate-capacity-' + venueGate.id} type="number" min={1} step={1} inputMode="numeric"
                        disabled={isFrozen} value={draft.capacity} onChange={(change) => gates.setCapacity(venueGate.id, change.target.value)} />
                      <span className="staff-select-label">Assign scanner staff</span>
                      {securityStaff.length === 0 ? (
                        <p className="event-empty-copy">Create a Security Staff account first.</p>
                      ) : (
                        <div className="staff-checkbox-list">
                          {securityStaff.map((person) => {
                            const isAlreadyAssigned = existingStaffIds.includes(person.id);
                            return (
                              <label className="staff-checkbox" key={person.id}>
                                <input type="checkbox" checked={draft.staffIds.includes(person.id)}
                                  disabled={isFrozen || (!person.is_active && !isAlreadyAssigned) || (!isDraft && isAlreadyAssigned)}
                                  onChange={(change) => gates.toggleStaff(venueGate.id, person.id, change.target.checked)} />
                                <span><strong>{person.name}</strong><small>{person.email}</small>
                                  {!person.is_active && <small className="staff-inactive-note">Inactive account</small>}
                                </span>
                                {isAlreadyAssigned && !isDraft && <small className="staff-locked-tag">Already assigned</small>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
          {!isDraft && !isFrozen && (
            <label className="gate-reason-field" htmlFor="gate-reason">Reason for access change <span>(required)</span>
              <textarea id="gate-reason" rows={2} maxLength={1000} required value={gates.reason} onChange={(change) => gates.setReason(change.target.value)} />
            </label>
          )}
          {!isFrozen && (
            <button className="btn btn--primary" type="submit" disabled={gates.isSaving}>
              {gates.isSaving ? <><Loader2 size={16} className="spin" /> Saving…</> : <><Save size={16} /> Save gate assignments</>}
            </button>
          )}
        </form>
      )}
    </section>
  );
}
