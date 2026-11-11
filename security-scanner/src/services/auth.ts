import { apiRequest, ApiError } from './apiClient';
import { getRoleRejectionMessage } from './signInCopy';

export type UserRole = 'student' | 'security_staff' | 'administrator';

type User = {
  id: number;
  name: string;
  /** Sent by the current API; optional so a session saved before it was added still loads. */
  email?: string;
  student_number: string | null;
  role: UserRole;
};

type LoginPayload = { token: string; user: User };
type UserPayload = { user: User };

export async function signInWithPassword(identifier: string, password: string) {
  const payload = await apiRequest<LoginPayload>('/auth/login', {
    method: 'POST',
    body: { identifier: identifier.trim(), password, device_name: 'euevent-mobile-client' },
  });

  const rejection = getRoleRejectionMessage(payload.user.role);
  if (rejection) {
    try {
      await apiRequest('/auth/logout', { method: 'POST', token: payload.token });
    } catch {
      // Keep the rejection message useful even if token cleanup cannot reach the API.
    }

    throw new Error(rejection);
  }

  return payload;
}

export async function fetchCurrentUser(token: string) {
  return apiRequest<UserPayload>('/auth/me', { token });
}

export async function signOutFromApi(token: string) {
  try {
    await apiRequest('/auth/logout', { method: 'POST', token });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
}

export type { User };
