import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import type { useStudentLookup } from '../../hooks/useStudentLookup';
import { NOT_REGISTERED_MESSAGE } from '../../services/ticketIssueMessages';

interface StudentLookupNoteProps {
  lookup: ReturnType<typeof useStudentLookup>;
}

/** Shows who a student number is registered to, or says that it is not registered yet. Text and a symbol, never colour alone. */
export function StudentLookupNote({ lookup }: StudentLookupNoteProps) {
  if (lookup.status === 'idle' || lookup.status === 'error') return null;

  if (lookup.status === 'checking') {
    return <p className="lookup-note lookup-note--checking" role="status"><Loader2 size={15} className="spin" aria-hidden="true" /> Checking registration…</p>;
  }

  if (lookup.status === 'not_found') {
    return <p className="lookup-note lookup-note--missing" role="status"><TriangleAlert size={15} aria-hidden="true" /> {NOT_REGISTERED_MESSAGE}</p>;
  }

  return (
    <p className="lookup-note lookup-note--found" role="status">
      <CheckCircle2 size={15} aria-hidden="true" />
      <span>Registered to <strong>{lookup.student?.name}</strong> · {lookup.student?.email}. Check that this is the right person.</span>
    </p>
  );
}
