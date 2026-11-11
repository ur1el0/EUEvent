interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Server validation message for this field, shown next to it. */
  error?: string;
  maxLength?: number;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
}

/** A labelled input or textarea with its field error right beneath it. */
export function FormField({ id, label, value, onChange, error, maxLength, required = false, optional = false, multiline = false }: FormFieldProps) {
  const errorId = id + '-error';
  const shared = {
    id,
    value,
    maxLength,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  } as const;

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}{optional && <span> Optional</span>}</label>
      {multiline
        ? <textarea {...shared} rows={3} onChange={(event) => onChange(event.target.value)} />
        : <input {...shared} onChange={(event) => onChange(event.target.value)} />}
      {error && <p className="field-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}
