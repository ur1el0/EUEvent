import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate, signOut } from './auth';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const admin = {
  id: 1,
  name: 'Event Administrator',
  student_number: null,
  role: 'administrator',
};

afterEach(() => vi.unstubAllGlobals());

describe('admin authentication service', () => {
  it('sends the admin device name and returns an administrator session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ token: 'issued-token', user: admin }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authenticate('admin@example.edu', 'password'))
      .resolves.toEqual({ token: 'issued-token', user: admin });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        identifier: 'admin@example.edu',
        password: 'password',
        device_name: 'euevent-admin-web',
      }),
    });
  });

  it('logs out a non-administrator token before rejecting dashboard access', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        token: 'student-token',
        user: { ...admin, role: 'student' },
      }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Signed out.' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authenticate('student@example.edu', 'password'))
      .rejects.toThrow('This dashboard is for administrator accounts.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/logout');
  });

  it('explains when a non-admin session could not be revoked', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        token: 'student-token',
        user: { ...admin, role: 'student' },
      }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Server unavailable.' }, 503)));

    await expect(authenticate('student@example.edu', 'password'))
      .rejects.toThrow(/requires an administrator account.*revoke this device session/i);
  });

  it('treats an already expired sign-out token as signed out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Unauthenticated.' }, 401)));

    await expect(signOut('expired-token')).resolves.toBeUndefined();
  });

  it('surfaces non-authentication sign-out failures for the operator to retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Server unavailable.' }, 503)));

    await expect(signOut('admin-token')).rejects.toThrow('Server unavailable.');
  });
});
