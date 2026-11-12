import { sessionStorage } from './sessionStorage';
import { apiRequestAtUrl, normalizeApiBaseUrl, testApiConnectionAtUrl } from './apiClientCore';
export { ApiError, NetworkError, normalizeApiBaseUrl } from './apiClientCore';

export const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '')
  || 'http://localhost:8000/api/v1';

export async function getApiBaseUrl(): Promise<string> {
  const saved = await sessionStorage.readApiBaseUrl();
  return saved?.trim() ? normalizeApiBaseUrl(saved) : DEFAULT_API_BASE_URL;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; token?: string; body?: unknown; baseUrl?: string } = {},
): Promise<T> {
  const baseUrl = options.baseUrl ? normalizeApiBaseUrl(options.baseUrl) : await getApiBaseUrl();
  return apiRequestAtUrl(baseUrl, path, options);
}

export async function testApiConnection(value: string): Promise<string> {
  return testApiConnectionAtUrl(value);
}
