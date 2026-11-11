// Display copy and timing rules for registration. No React or Expo imports, so they run under `node --test`.
// None of this text says whether an account already exists: the server answers the same way either way.

/** Shown on the sign-in screen after a successful verification. Students sign in with their student number. */
export const REGISTRATION_SUCCESS_NOTICE = 'Your account is ready. Sign in with your student number and password.';

export type RegistrationErrorCopy = {
  /** Short text shown on screen. */
  message: string;
  /** What a screen reader announces; keeps the original server text. */
  spokenMessage: string;
};

type ErrorShape = { name: string; status: number | null; original: string };

function readError(error: unknown): ErrorShape {
  const original = error instanceof Error ? error.message.trim() : '';
  const name = error instanceof Error ? error.name : '';
  const rawStatus = (error as { status?: unknown } | null)?.status;

  return { name, original, status: name === 'ApiError' && typeof rawStatus === 'number' ? rawStatus : null };
}

function withSpoken(message: string, original: string): RegistrationErrorCopy {
  return {
    message,
    spokenMessage: original && original !== message ? `${message} Server message: ${original}` : message,
  };
}

function commonCopy({ name, status }: ErrorShape): string | null {
  if (name === 'NetworkError') return 'Can’t reach the event server. Check your Wi-Fi or mobile data, then try again.';
  if (status === 429) return 'Too many attempts. Wait a minute, then try again.';
  if (status !== null && status >= 500) return 'The event server had a problem. Try again in a moment.';

  return null;
}

/** Errors from creating the registration. A 422 carries the server's field message, such as "Use your MSEUF email address." */
export function getRegistrationErrorCopy(error: unknown): RegistrationErrorCopy {
  const shape = readError(error);
  const message = commonCopy(shape) ?? (shape.original || 'Could not start your registration. Try again.');

  return withSpoken(message, shape.original);
}

/** Errors from checking or re-sending a code. A wrong, expired or used code always reads the same. */
export function getVerifyErrorCopy(error: unknown): RegistrationErrorCopy {
  const shape = readError(error);
  const message = commonCopy(shape)
    ?? (shape.status === 422
      ? 'The code is invalid or expired. Request a new code and try again.'
      : shape.original || 'Could not check the code. Try again.');

  return withSpoken(message, shape.original);
}

/** Whole seconds left before a new code may be requested, never below zero. */
export function secondsUntil(availableAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
}

export function getResendLabel(secondsLeft: number): string {
  return secondsLeft > 0 ? `Send a new code in ${secondsLeft}s` : 'Send a new code';
}
