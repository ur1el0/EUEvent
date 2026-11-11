import { useState } from 'react';
import type { SubmitResult } from './useVenues';
import type { FieldErrors } from '../types/venues';

/** Tracks one form's submit state: busy flag, server field errors and a form-level message. */
export function useFormSubmit() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  async function submit(action: () => Promise<SubmitResult>): Promise<boolean> {
    setBusy(true);
    setErrors({});
    setMessage(null);
    const result = await action();
    setBusy(false);

    if (result.ok) return true;

    setErrors(result.errors);
    // A 422 shows its messages beside the fields; anything else is shown once above the buttons.
    setMessage(Object.keys(result.errors).length > 0 ? null : result.message);
    return false;
  }

  return { busy, errors, message, submit, fieldError: (field: string) => errors[field]?.[0] };
}
