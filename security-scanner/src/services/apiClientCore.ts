export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function normalizeApiBaseUrl(value: string): string {
  const url = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s/?#]+(?:\/[^?#]*)?$/i.test(url) || !url.endsWith('/api/v1')) {
    throw new Error('Enter a valid server URL ending in /api/v1.');
  }
  return url;
}

export async function apiRequestAtUrl<T>(
  baseUrl: string,
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; token?: string; body?: unknown } = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  let response: Response;
  try {
    response = await fetcher(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError('Could not reach the event server. Check the server address and network.');
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    throw new ApiError(payload.message ?? `The server returned HTTP ${response.status}.`, response.status);
  }

  return payload as T;
}

export async function testApiConnectionAtUrl(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const url = normalizeApiBaseUrl(value);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);
  let response: Response;

  try {
    response = await fetcher(url + '/auth/me', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    throw new Error('Could not reach the server. Check the address and that this phone is on the event network.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.ok || response.status === 401) return 'The EUEvent API is reachable.';

  throw new Error('The server responded with HTTP ' + response.status + '. Check that this is the EUEvent API URL.');
}
