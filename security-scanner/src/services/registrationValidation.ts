// Pure registration form rules. No React or Expo imports, so they run under `node --test`.
import {
  ALLOWED_EMAIL_DOMAINS,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  STUDENT_NUMBER_EXAMPLE,
  STUDENT_NUMBER_PATTERN,
  VERIFICATION_CODE_LENGTH,
} from './registrationConstants';

export type RegistrationValues = {
  studentNumber: string;
  name: string;
  email: string;
  password: string;
  confirmation: string;
};

export type RegistrationField = keyof RegistrationValues;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export function normalizeStudentNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** The lowercased text after the last "@", or null when there is no "@". */
export function getEmailDomain(email: string): string | null {
  const value = normalizeEmail(email);
  const at = value.lastIndexOf('@');

  return at === -1 ? null : value.slice(at + 1);
}

/**
 * The domain must EQUAL an allowed domain. This is deliberately not an "ends with" check, so
 * evilmseuf.edu.ph and student.mseuf.edu.ph.evil.com never pass.
 */
export function isAllowedEmailDomain(email: string): boolean {
  const domain = getEmailDomain(email);

  return domain !== null && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

function looksLikeAnEmail(email: string): boolean {
  const value = normalizeEmail(email);
  const at = value.lastIndexOf('@');

  return at > 0 && at < value.length - 1 && !/\s/.test(value) && value.indexOf('@') === at;
}

export function getStudentNumberError(value: string): string {
  const studentNumber = normalizeStudentNumber(value);
  if (!studentNumber) return 'Enter your student number.';
  if (!STUDENT_NUMBER_PATTERN.test(studentNumber)) return `Use the format ${STUDENT_NUMBER_EXAMPLE}: one letter, two digits, a dash, then five digits.`;

  return '';
}

export function getNameError(value: string): string {
  return value.trim().length >= MIN_NAME_LENGTH ? '' : 'Enter your full name.';
}

export function getEmailError(value: string): string {
  if (!value.trim()) return 'Enter your school email.';
  if (!looksLikeAnEmail(value)) return 'Enter a valid email address.';
  if (!isAllowedEmailDomain(value)) return `Use your school email, ending in @${ALLOWED_EMAIL_DOMAINS.join(' or @')}.`;

  return '';
}

export function getPasswordError(value: string): string {
  if (!value) return 'Enter a password.';

  return value.length >= MIN_PASSWORD_LENGTH ? '' : `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
}

export function getConfirmationError(password: string, confirmation: string): string {
  if (!confirmation) return 'Enter your password again.';

  return password === confirmation ? '' : 'The passwords do not match.';
}

export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {
    studentNumber: getStudentNumberError(values.studentNumber),
    name: getNameError(values.name),
    email: getEmailError(values.email),
    password: getPasswordError(values.password),
    confirmation: getConfirmationError(values.password, values.confirmation),
  };

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as RegistrationErrors;
}

/** Keeps only digits, up to the code length, so pasted text such as "123 456" still works. */
export function sanitizeVerificationCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH);
}

export function isVerificationCodeComplete(value: string): boolean {
  return sanitizeVerificationCode(value).length === VERIFICATION_CODE_LENGTH;
}
