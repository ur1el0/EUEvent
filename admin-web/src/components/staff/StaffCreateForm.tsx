import { useState, type FormEvent } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import type { NewStaffValues } from '../../hooks/useSecurityStaff';

interface StaffCreateFormProps {
  isSaving: boolean;
  onCreate: (values: NewStaffValues) => Promise<boolean>;
}

export function StaffCreateForm({ isSaving, onCreate }: StaffCreateFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const created = await onCreate({ name, email, password, password_confirmation: confirmation });
    if (created) {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmation('');
    }
  }

  return (
    <section className="surface-card panel staff-create-panel" aria-labelledby="staff-create-title">
      <div className="panel-heading">
        <div><span className="eyebrow">New account</span><h2 id="staff-create-title">Add security staff</h2></div>
        <span className="panel-icon"><UserPlus size={19} /></span>
      </div>
      <form className="staff-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="staff-name">Full name</label>
        <input id="staff-name" autoComplete="name" maxLength={255} required value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="staff-email">Institutional email</label>
        <input id="staff-email" type="email" autoComplete="email" maxLength={255} required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="staff-password">Initial password</label>
        <input id="staff-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="staff-password-confirmation">Confirm initial password</label>
        <input id="staff-password-confirmation" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        <p className="staff-form-hint">Use at least 12 characters. The scanner account is created with the Security Staff role.</p>
        <button className="button-primary staff-submit" type="submit" disabled={isSaving}>
          {isSaving ? <><Loader2 size={17} className="spin" /> Creating account…</> : <><UserPlus size={17} /> Create staff account</>}
        </button>
      </form>
    </section>
  );
}
