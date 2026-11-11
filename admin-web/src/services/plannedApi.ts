import { apiRequest, ApiError } from './apiClient';

export const FEATURE_UNAVAILABLE_MESSAGE = "This feature isn't available on the server yet.";

export class FeatureUnavailableError extends Error {
  constructor() {
    super(FEATURE_UNAVAILABLE_MESSAGE);
    this.name = 'FeatureUnavailableError';
  }
}

type RequestOptions = Parameters<typeof apiRequest>[1];

/**
 * For endpoints documented as planned in docs/api.md. While the backend has no route for them the
 * server answers 404 or 405; that becomes a clear message instead of a raw error. Any other
 * failure, including a 422 or 500, is passed through unchanged. Nothing is faked on success.
 */
export async function plannedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (cause) {
    if (cause instanceof ApiError && (cause.status === 404 || cause.status === 405)) {
      throw new FeatureUnavailableError();
    }
    throw cause;
  }
}
