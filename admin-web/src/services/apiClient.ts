export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

interface RequestOptions {
  token?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(apiBaseUrl + path, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const payload = await response.json().catch(() => null) as {
    message?: string;
    errors?: Record<string, string[]>;
  } | null;

  if (!response.ok) {
    const validationMessage = payload?.errors ? Object.values(payload.errors).flat()[0] : undefined;
    throw new ApiError(
      validationMessage || payload?.message || 'Request failed (' + response.status + ').',
      response.status,
      payload?.errors ?? {},
    );
  }

  return payload as T;
}

/** The first server validation message for one field, if the request failed with a 422 for it. */
export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError ? error.errors[field]?.[0] : undefined;
}
