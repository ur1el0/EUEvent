// Display-only countdown copy for the rotating pass. The 30-second step and
// validation live in totp.ts and the scanner; nothing here changes them.

/** Seconds before the code changes when the pass asks the student to wait. */
export const NEW_CODE_WARNING_SECONDS = 3;

/** Hint for the last seconds of a step, when a scan risks reading a code that is about to expire. */
export function getNewCodeHint(secondsRemaining: number): string | null {
  if (secondsRemaining < 1 || secondsRemaining > NEW_CODE_WARNING_SECONDS) return null;

  return `New code in ${secondsRemaining}… wait before scanning`;
}
