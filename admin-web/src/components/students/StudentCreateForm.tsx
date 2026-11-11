import { useState, type FormEvent } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import type { NewStudentValues } from '../../hooks/useStudents';

interface StudentCreateFormProps {
  isSaving: boolean;
  onCreate: (values: NewStudentValues) => Promise<boolean>;
}

export function StudentCreateForm({ isSaving, onCreate }: StudentCreateFormProps) {
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const created = await onCreate({
      name, student_number: studentNumber, email, password, password_confirmation: confirmation,
    });
    if (created) {
      setName('');
      setStudentNumber('');
      setEmail('');
      setPassword('');
      setConfirmation('');
    }
  }

  return (
    <section className="surface-card panel student-create-panel" aria-labelledby="student-create-title">
      <div className="panel-heading">
        <div><span className="eyebrow">New account</span><h2 id="student-create-title">Add a student</h2></div>
        <span className="panel-icon"><UserPlus size={19} /></span>
      </div>
      <form className="student-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="student-name">Full name</label>
        <input id="student-name" autoComplete="name" maxLength={255} required value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="student-number">Student number</label>
        <input id="student-number" autoComplete="off" maxLength={32} required value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} />
        <label htmlFor="student-email">Institutional email</label>
        <input id="student-email" type="email" autoComplete="email" maxLength={255} required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="student-password">Initial password</label>
        <input id="student-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="student-password-confirmation">Confirm initial password</label>
        <input id="student-password-confirmation" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        <p className="student-form-hint">At least 12 characters. EUEvent assigns the Student role automatically. Students can reset their password from the mobile app.</p>
        <button className="button-primary student-submit" type="submit" disabled={isSaving}>
          {isSaving ? <><Loader2 size={17} className="spin" /> Creating account…</> : <><UserPlus size={17} /> Create student account</>}
        </button>
      </form>
    </section>
  );
}
