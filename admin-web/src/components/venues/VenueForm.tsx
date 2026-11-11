import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useFormSubmit } from '../../hooks/useFormSubmit';
import type { SubmitResult } from '../../hooks/useVenues';
import type { CreateVenuePayload } from '../../types/venues';
import { FormField } from '../ui/FormField';

interface VenueFormProps {
  idPrefix: string;
  initial?: CreateVenuePayload;
  submitLabel: string;
  onSubmit: (values: CreateVenuePayload) => Promise<SubmitResult>;
  onDone?: () => void;
}

/** Name and location details; used to create a venue and to edit one. */
export function VenueForm({ idPrefix, initial, submitLabel, onSubmit, onDone }: VenueFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location_details ?? '');
  const form = useFormSubmit();

  async function handle(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const saved = await form.submit(() => onSubmit({ name: name.trim(), location_details: location.trim() || null }));
    if (!saved) return;
    if (!initial) { setName(''); setLocation(''); }
    onDone?.();
  }

  return (
    <form className="venue-form" onSubmit={(event) => void handle(event)}>
      <FormField id={`${idPrefix}-name`} label="Venue name" value={name} onChange={setName} maxLength={150} required error={form.fieldError('name')} />
      <FormField id={`${idPrefix}-location`} label="Location details" value={location} onChange={setLocation} maxLength={500} optional multiline error={form.fieldError('location_details')} />
      {form.message && <p className="field-error" role="alert">{form.message}</p>}
      <div className="form-actions-row">
        <button className="btn btn--primary" type="submit" disabled={form.busy || !name.trim()}>
          {form.busy ? <><Loader2 size={16} className="spin" /> Saving…</> : submitLabel}
        </button>
        {onDone && <button className="btn btn--secondary" type="button" disabled={form.busy} onClick={onDone}>Cancel</button>}
      </div>
    </form>
  );
}
