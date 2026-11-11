// Registration rules in one place so they are easy to change. They mirror the server's config/registration.php;
// the server is the authority and checks every value again.

/** The text after the last "@" must equal one of these exactly. */
export const ALLOWED_EMAIL_DOMAINS: readonly string[] = ['student.mseuf.edu.ph', 'mseuf.edu.ph'];

/** Student numbers look like A12-34567. Input is accepted in any case and uppercased. */
export const STUDENT_NUMBER_PATTERN = /^[A-Z]\d{2}-\d{5}$/;
export const STUDENT_NUMBER_EXAMPLE = 'A12-34567';

export const MIN_PASSWORD_LENGTH = 12;
export const MIN_NAME_LENGTH = 2;

export const VERIFICATION_CODE_LENGTH = 6;
export const CODE_LIFETIME_MINUTES = 15;
export const RESEND_COOLDOWN_SECONDS = 60;
