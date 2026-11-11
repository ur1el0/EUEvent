// Pure sign-in view rules. No React or Expo imports, so they run under `node --test`.

export type SignInErrorCopy = {
  /** Short, friendly text shown on screen. */
  message: string;
  /** What a screen reader announces; keeps the original server text. */
  spokenMessage: string;
};

/** One field serves both roles: the API accepts a student number or an email as `identifier`. */
export const IDENTIFIER_LABEL = 'Student number or email';
const IDENTIFIER_NAME = 'student number or email';

/** Returns why this role cannot use the mobile app, or null when it can (students and security staff). */
export function getRoleRejectionMessage(role: string): string | null {
  if (role === 'student' || role === 'security_staff') return null;
  if (role === 'administrator') return 'Administrators sign in through the desktop dashboard.';

  return 'This account type can’t sign in to the mobile app.';
}

/** Explains why the sign-in button is disabled, or returns null when it is enabled. */
export function getSignInMissingHint(identifier: string, password: string): string | null {
  const needsIdentifier = !identifier.trim();
  const needsPassword = !password;

  if (needsIdentifier && needsPassword) return `Enter your ${IDENTIFIER_NAME} and password to continue.`;
  if (needsIdentifier) return `Enter your ${IDENTIFIER_NAME} to continue.`;
  if (needsPassword) return 'Enter your password to continue.';

  return null;
}

export function getSignInErrorCopy(error: unknown): SignInErrorCopy {
  const original = error instanceof Error ? error.message.trim() : '';
  const name = error instanceof Error ? error.name : '';
  const rawStatus = (error as { status?: unknown } | null)?.status;
  const status = name === 'ApiError' && typeof rawStatus === 'number' ? rawStatus : null;
  let message: string;

  if (name === 'NetworkError') {
    message = 'Can’t reach the event server. Check your Wi-Fi or mobile data, then try again.';
  } else if (status === 401 || status === 422) {
    message = `That ${IDENTIFIER_NAME} and password don’t match an active account. Check both and try again.`;
  } else if (status === 429) {
    message = 'Too many sign-in attempts. Wait one minute, then try again.';
  } else if (status !== null && status >= 500) {
    message = 'The event server had a problem. Try again in a moment.';
  } else {
    message = original || 'Sign-in failed. Try again.';
  }

  return {
    message,
    spokenMessage: original && original !== message ? `${message} Server message: ${original}` : message,
  };
}
