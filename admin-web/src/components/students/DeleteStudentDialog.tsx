import type { StudentAccount } from '../../types/accounts';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface DeleteStudentDialogProps {
  student: StudentAccount | null;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteStudentDialog({ student, busy, error, onConfirm, onCancel }: DeleteStudentDialogProps) {
  return (
    <ConfirmDialog
      open={student !== null}
      title={student ? `Delete ${student.name}?` : 'Delete student account?'}
      confirmLabel="Delete account"
      tone="danger"
      busy={busy}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {student && <p><strong>{student.name}</strong> · student number {student.student_number}</p>}
      <p>
        This account will be hidden and can no longer sign in. Any active tickets will be revoked. Ticket and
        scan history is kept for audit. A phone that is offline may keep showing a saved pass until it reconnects.
      </p>
    </ConfirmDialog>
  );
}
