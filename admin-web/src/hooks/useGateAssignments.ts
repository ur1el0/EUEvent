import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../services/errorMessage';
import { saveEventGates } from '../services/eventService';
import type { AdminEvent, GateDraft } from '../types/events';
import type { VenueGate } from '../types/venues';
import type { FlashMessages } from './useFlashMessages';

function draftsFrom(event: AdminEvent): GateDraft[] {
  return event.event_gates.map((gate) => ({
    venueGateId: gate.venue_gate_id,
    capacity: gate.capacity === null ? '' : String(gate.capacity),
    staffIds: gate.security_staff.map((person) => person.id),
  }));
}

/** Gate and staff selection for one event, saved with PUT /admin/events/{event}/gates. */
export function useGateAssignments(token: string, event: AdminEvent, flash: FlashMessages, onUpdated: (event: AdminEvent) => void) {
  const [gateDraft, setGateDraft] = useState<GateDraft[]>(() => draftsFrom(event));
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setGateDraft(draftsFrom(event));
    setReason('');
  }, [event.id, event.configuration_version]);

  function updateGate(venueGateId: number, update: (gate: GateDraft) => GateDraft): void {
    setGateDraft((current) => current.map((gate) => (gate.venueGateId === venueGateId ? update(gate) : gate)));
  }

  function toggleGate(gate: VenueGate, isChecked: boolean): void {
    setGateDraft((current) => (isChecked
      ? [...current, { venueGateId: gate.id, capacity: '', staffIds: [] }]
      : current.filter((item) => item.venueGateId !== gate.id)));
  }

  function toggleStaff(venueGateId: number, staffId: number, isChecked: boolean): void {
    updateGate(venueGateId, (gate) => ({
      ...gate,
      staffIds: isChecked ? [...new Set([...gate.staffIds, staffId])] : gate.staffIds.filter((id) => id !== staffId),
    }));
  }

  async function save(submitEvent: FormEvent<HTMLFormElement>): Promise<void> {
    submitEvent.preventDefault();
    flash.clear();

    if (event.status !== 'draft' && !reason.trim()) {
      flash.setError('Add a reason when changing gates or staff on a scheduled event.');
      return;
    }

    setIsSaving(true);
    try {
      const gates = gateDraft.map((gate) => ({
        venue_gate_id: gate.venueGateId,
        capacity: gate.capacity.trim() ? Number(gate.capacity) : null,
        security_staff_ids: gate.staffIds,
      }));
      onUpdated(await saveEventGates(token, event.id, gates, reason));
      flash.setNotice('Gate and staff assignments saved. Scanner access follows this event configuration.');
    } catch (cause) {
      flash.setError(errorMessage(cause, 'Could not save gate assignments.'));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    gateDraft,
    reason,
    setReason,
    isSaving,
    toggleGate,
    toggleStaff,
    setCapacity: (venueGateId: number, capacity: string) => updateGate(venueGateId, (gate) => ({ ...gate, capacity })),
    save: (submitEvent: FormEvent<HTMLFormElement>) => void save(submitEvent),
  };
}
