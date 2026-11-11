import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useFormSubmit } from '../../hooks/useFormSubmit';
import type { SubmitResult } from '../../hooks/useVenues';
import type { CreateGatePayload } from '../../types/venues';
import { FormField } from '../ui/FormField';

interface GateFormProps {
  idPrefix: string;
  initial?: CreateGatePayload;
  submitLabel: string;
  onSubmit: (values: CreateGatePayload) => Promise<SubmitResult>;
  onDone: () => void;
}

/** Gate code and name; used to add a gate to a venue and to edit one. */
export function GateForm({ idPrefix, initial, submitLabel, onSubmit, onDone }: GateFormProps) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const form = useFormSubmit();

  async function handle(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const saved = await form.submit(() => onSubmit({ code: code.trim(), name: name.trim() }));
    if (saved) onDone();
  }

  return (
    <form className="gate-form" onSubmit={(event) => void handle(event)}>
      <FormField id={`${idPrefix}-code`} label="Gate code" value={code} onChange={setCode} maxLength={32} required error={form.fieldError('code')} />
      <FormField id={`${idPrefix}-name`} label="Gate name" value={name} onChange={setName} maxLength={150} required error={form.fieldError('name')} />
      {form.message && <p className="field-error" role="alert">{form.message}</p>}
      <div className="form-actions-row">
        <button className="btn btn--primary btn--compact" type="submit" disabled={form.busy || !code.trim() || !name.trim()}>
          {form.busy ? <><Loader2 size={15} className="spin" /> Saving…</> : submitLabel}
        </button>
        <button className="btn btn--secondary btn--compact" type="button" disabled={form.busy} onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
