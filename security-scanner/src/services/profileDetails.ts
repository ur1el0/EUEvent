// Pure profile display rules. No React or Expo imports, so they run under `node --test`.

const ROLE_LABELS: Record<string, string> = {
  security_staff: 'Security staff',
  student: 'Student',
  administrator: 'Administrator',
};

/** Shown for any detail the API did not send (for example the email from an older API). */
export const UNAVAILABLE_TEXT = 'Not available';
export const EMAIL_UNAVAILABLE_TEXT = UNAVAILABLE_TEXT;

export type ProfileUser = {
  name?: string | null;
  email?: string | null;
  student_number?: string | null;
  role?: string | null;
};

export type ProfileField = { label: string; value: string };

function textOrUnavailable(value: string | null | undefined): string {
  const text = typeof value === 'string' ? value.trim() : '';

  return text || UNAVAILABLE_TEXT;
}

export function getProfileEmailText(email: string | null | undefined): string {
  return textOrUnavailable(email);
}

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return '';

  return ROLE_LABELS[role] ?? role;
}

/** Students also see their student number; staff accounts do not have one. */
export function getProfileFields(user: ProfileUser | null | undefined): ProfileField[] {
  const fields: ProfileField[] = [{ label: 'NAME', value: textOrUnavailable(user?.name) }];

  if (user?.role === 'student') {
    fields.push({ label: 'STUDENT NUMBER', value: textOrUnavailable(user.student_number) });
  }

  fields.push(
    { label: 'EMAIL', value: textOrUnavailable(user?.email) },
    { label: 'ROLE', value: textOrUnavailable(getRoleLabel(user?.role)) },
  );

  return fields;
}

/** Explains what signing out does to data on this phone. */
export function getSignOutNote(role: string | null | undefined): string {
  return role === 'student'
    ? 'Signing out removes your saved tickets from this phone. They return when you sign in again while connected.'
    : 'Signing out keeps unsent scans on this phone for this account.';
}

/** Only students and security staff use the mobile app, and only while signed in. */
export function canOpenProfile(role: string | null | undefined): boolean {
  return role === 'student' || role === 'security_staff';
}
