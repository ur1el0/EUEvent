import { useState } from 'react';
import { DoorOpen, MapPin, Pencil, Plus } from 'lucide-react';
import type { useVenues } from '../../hooks/useVenues';
import type { Venue } from '../../types/venues';
import { GateForm } from './GateForm';
import { VenueForm } from './VenueForm';

interface VenueCardProps {
  venue: Venue;
  actions: ReturnType<typeof useVenues>;
}

/** One venue with its gates. Gates and venues can be added and edited, never deleted. */
export function VenueCard({ venue, actions }: VenueCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingGate, setIsAddingGate] = useState(false);
  const [editingGateId, setEditingGateId] = useState<number | null>(null);

  return (
    <li className="surface-card panel venue-card">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Venue #{venue.id} · {venue.gates.length} {venue.gates.length === 1 ? 'gate' : 'gates'}</span>
          <h2>{venue.name}</h2>
        </div>
        <button className="btn btn--secondary btn--compact" type="button" aria-label={`Edit venue ${venue.name}`}
          onClick={() => setIsEditing((current) => !current)}>
          <Pencil size={14} /> Edit
        </button>
      </div>

      {isEditing ? (
        <VenueForm idPrefix={`venue-${venue.id}`} initial={{ name: venue.name, location_details: venue.location_details }}
          submitLabel="Save venue" onSubmit={(values) => actions.edit(venue.id, values)} onDone={() => setIsEditing(false)} />
      ) : (
        <p className="venue-location"><MapPin size={14} aria-hidden="true" /> {venue.location_details || 'No location details'}</p>
      )}

      <ul className="venue-gates" aria-label={`Gates at ${venue.name}`}>
        {venue.gates.length === 0 && <li className="venue-gates__empty">No gates yet. Events at this venue need at least one gate.</li>}
        {venue.gates.map((gate) => (
          <li key={gate.id}>
            {editingGateId === gate.id ? (
              <GateForm idPrefix={`gate-${gate.id}`} initial={{ code: gate.code, name: gate.name }} submitLabel="Save gate"
                onSubmit={(values) => actions.editGate(venue.id, gate.id, values)} onDone={() => setEditingGateId(null)} />
            ) : (
              <div className="venue-gate">
                <span className="gate-row__icon"><DoorOpen size={14} aria-hidden="true" /></span>
                <span className="venue-gate__copy"><strong>{gate.code}</strong><span>{gate.name}</span></span>
                <button className="btn btn--secondary btn--compact" type="button" aria-label={`Edit gate ${gate.code}`}
                  onClick={() => { setEditingGateId(gate.id); setIsAddingGate(false); }}>
                  <Pencil size={13} /> Edit
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isAddingGate ? (
        <GateForm idPrefix={`new-gate-${venue.id}`} submitLabel="Add gate"
          onSubmit={(values) => actions.addGate(venue.id, values)} onDone={() => setIsAddingGate(false)} />
      ) : (
        <button className="btn btn--secondary btn--compact venue-add-gate" type="button"
          onClick={() => { setIsAddingGate(true); setEditingGateId(null); }}>
          <Plus size={14} /> Add gate
        </button>
      )}
    </li>
  );
}
