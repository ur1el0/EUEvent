import { Info } from 'lucide-react';

const ACCOUNT_EMAIL_DOMAINS = ['@student.mseuf.edu.ph', '@mseuf.edu.ph'];

/** Explains where student accounts come from now that administrators no longer create them. */
export function StudentSelfServiceNote() {
  return (
    <p className="info-note" role="note">
      <Info size={18} aria-hidden="true" />
      <span>
        Students create their own accounts in the mobile app, using their {ACCOUNT_EMAIL_DOMAINS[0]} or {ACCOUNT_EMAIL_DOMAINS[1]} email.
        You can delete an account here.
      </span>
    </p>
  );
}
