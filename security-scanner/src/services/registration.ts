import { apiRequest } from './apiClient';
import { normalizeEmail, normalizeStudentNumber, type RegistrationValues } from './registrationValidation';

type MessageResponse = { message: string };

/** Starts a registration. The server always answers with the same message, so this never says whether an account exists. */
export function registerStudent(values: RegistrationValues, serverUrl: string): Promise<MessageResponse> {
  return apiRequest('/auth/register', {
    method: 'POST',
    baseUrl: serverUrl,
    body: {
      student_number: normalizeStudentNumber(values.studentNumber),
      name: values.name.trim(),
      email: normalizeEmail(values.email),
      password: values.password,
      password_confirmation: values.confirmation,
    },
  });
}

/** Creates the account when the code is right. No token is returned; the student signs in afterwards. */
export function verifyRegistration(email: string, code: string, serverUrl: string): Promise<MessageResponse> {
  return apiRequest('/auth/register/verify', {
    method: 'POST',
    baseUrl: serverUrl,
    body: { email: normalizeEmail(email), code },
  });
}

export function resendRegistrationCode(email: string, serverUrl: string): Promise<MessageResponse> {
  return apiRequest('/auth/register/resend', {
    method: 'POST',
    baseUrl: serverUrl,
    body: { email: normalizeEmail(email) },
  });
}
