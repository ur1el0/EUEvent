import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './apiClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('sends GET requests with JSON accept and bearer authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ events: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/admin/events', { token: 'admin-token' })).resolves.toEqual({ events: [] });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/events', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer admin-token',
      },
    });
  });

  it('serializes JSON request bodies and sets the matching content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 7 }));
    vi.stubGlobal('fetch', fetchMock);
    const body = { name: 'Campus event' };

    await apiRequest('/admin/events', { method: 'POST', body });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/events', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  });

  it('uses the first validation error in an API error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      message: 'The given data was invalid.',
      errors: { name: ['An event name is required.'], venue_id: ['Choose a venue.'] },
    }, 422)));

    await expect(apiRequest('/admin/events', { method: 'POST', body: {} }))
      .rejects.toMatchObject({ name: 'ApiError', status: 422, message: 'An event name is required.' });
  });

  it('falls back to the server message or status when error details are missing', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'Session expired.' }, 401))
      .mockResolvedValueOnce(jsonResponse({}, 503)));

    await expect(apiRequest('/admin/metrics')).rejects.toMatchObject({
      name: 'ApiError', status: 401, message: 'Session expired.',
    });
    await expect(apiRequest('/admin/metrics')).rejects.toMatchObject({
      name: 'ApiError', status: 503, message: 'Request failed (503).',
    });
    expect(new ApiError('x', 400)).toBeInstanceOf(Error);
  });
});
