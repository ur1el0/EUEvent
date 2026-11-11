// Pure sign-in view rules. No React or Expo imports, so they run under `node --test`.

export type SignInAccountType = 'student' | 'security_staff';

export type SignInErrorCopy = {
  /** Short, friendly text shown on screen. */
  message: string;
  /** What a screen reader announces; keeps the original server text. */
  spokenMessage: string;
};

/** Students sign in with a student number and staff with an email (see AuthController::login). */
export function identifierFitsAccountType(identifier: string, accountType: SignInAccountType): boolean {
  const value = identifier.trim();
  if (!value) return true;

  return accountType === 'security_staff' ? value.includes('@') : !value.includes('@');
}

export function getIdentifierName(accountType: SignInAccountType): string {
  return accountType === 'student' ? 'student number' : 'staff email';
}

/** Explains why the sign-in button is disabled, or returns null when it is enabled. */
export function getSignInMissingHint(accountType: SignInAccountType, identifier: string, password: string): string | null {
  const needsIdentifier = !identifier.trim();
  const needsPassword = !password;
  const identifierName = getIdentifierName(accountType);

  if (needsIdentifier && needsPassword) return `Enter your ${identifierName} and password to continue.`;
  if (needsIdentifier) return `Enter your ${identifierName} to continue.`;
  if (needsPassword) return 'Enter your password to continue.';

  return null;
}

export function getSignInErrorCopy(error: unknown, accountType: SignInAccountType): SignInErrorCopy {
  const original = error instanceof Error ? error.message.trim() : '';
  const name = error instanceof Error ? error.name : '';
  const rawStatus = (error as { status?: unknown } | null)?.status;
  const status = name === 'ApiError' && typeof rawStatus === 'number' ? rawStatus : null;
  let message: string;

  if (name === 'NetworkError') {
    message = 'Can’t reach the event server. Check your Wi-Fi or mobile data, then try again.';
  } else if (status === 401 || status === 422) {
    message = `That ${getIdentifierName(accountType)} and password don’t match an active account. Check both and try again.`;
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
