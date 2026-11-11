/** The server's message when there is one, otherwise a plain fallback. Never a raw stack or object. */
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
