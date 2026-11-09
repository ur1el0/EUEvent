import { apiRequest } from './apiClient';

type PasswordResetResponse = { message: string };

export async function requestPasswordResetToken(email: string, serverUrl: string): Promise<PasswordResetResponse> {
  return apiRequest('/auth/password/email', {
    method: 'POST',
    baseUrl: serverUrl,
    body: { email: email.trim().toLowerCase() },
  });
}

export async function resetPassword(
  input: { email: string; token: string; password: string; password_confirmation: string },
  serverUrl: string,
): Promise<PasswordResetResponse> {
  return apiRequest('/auth/password/reset', {
    method: 'POST',
    baseUrl: serverUrl,
    body: {
      ...input,
      email: input.email.trim().toLowerCase(),
    },
  });
}
