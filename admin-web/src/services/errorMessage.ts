import { ApiError } from './apiClient';

/** True when the server says the record does not exist (HTTP 404). */
export function isNotFoundError(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 404;
}

/** The server's message when there is one, otherwise a plain fallback. Never a raw stack or object. */
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
