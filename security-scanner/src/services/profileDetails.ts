// Pure profile display rules. No React or Expo imports, so they run under `node --test`.

const ROLE_LABELS: Record<string, string> = {
  security_staff: 'Security staff',
  student: 'Student',
  administrator: 'Administrator',
};

export const EMAIL_UNAVAILABLE_TEXT = 'Not available';

/** An older API may not send an email, so a missing or blank value is shown as unavailable. */
export function getProfileEmailText(email: string | null | undefined): string {
  const value = typeof email === 'string' ? email.trim() : '';

  return value || EMAIL_UNAVAILABLE_TEXT;
}

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return '';

  return ROLE_LABELS[role] ?? role;
}
