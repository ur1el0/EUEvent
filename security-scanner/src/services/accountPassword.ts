import { apiRequest } from './apiClient';

export const MIN_PASSWORD_LENGTH = 12;

type ChangePasswordResponse = { message: string };

export async function changeAccountPassword(
  token: string,
  input: { current_password: string; password: string; password_confirmation: string },
): Promise<ChangePasswordResponse> {
  return apiRequest('/auth/password', {
    method: 'PATCH',
    token,
    body: input,
  });
}
