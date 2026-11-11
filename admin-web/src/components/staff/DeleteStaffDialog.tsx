import type { SecurityStaff } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface DeleteStaffDialogProps {
  person: SecurityStaff | null;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteStaffDialog({ person, busy, error, onConfirm, onCancel }: DeleteStaffDialogProps) {
  return (
    <ConfirmDialog
      open={person !== null}
      title={person ? `Delete ${person.name}?` : 'Delete staff account?'}
      confirmLabel="Delete account"
      tone="danger"
      busy={busy}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {person && <p><strong>{person.name}</strong> · {person.email}</p>}
      <p>
        This account will be hidden and can no longer sign in. Its sign-in sessions will be ended. Scan and
        assignment history is kept for audit. A phone that is offline may keep working from its saved ticket
        list until it reconnects.
      </p>
    </ConfirmDialog>
  );
}
