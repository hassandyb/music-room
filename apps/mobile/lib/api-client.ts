import { getBackendUrl } from './api-config';
import { getDeviceHeaders } from './device-metadata';

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  // Parsed JSON body of the error response, when there was one - e.g. a 409
  // version conflict's { message, currentVersion }. Callers that need more
  // than the message string (playlist optimistic-concurrency retries) read
  // this instead of re-parsing.
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Backend delivers the JWT only as an httpOnly cookie (never in the JSON body,
// no Authorization-header support server-side at all) - see auth.service.ts.
// React Native's fetch is backed by the platform's native networking stack
// (NSURLSession on iOS, OkHttp on Android), which manages cookies automatically,
// including httpOnly ones, without JS ever reading them. `credentials: 'include'`
// is what tells it to send/store cookies for this request.
export async function apiFetch(path: string, options: ApiOptions = {}) {
  const baseUrl = await getBackendUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...getDeviceHeaders(),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(json?.message ?? `Request failed (${res.status})`, res.status, json);
  }

  return json;
}

export async function apiFetchMultipart(path: string, formData: FormData, options: { method?: 'POST' | 'PUT' } = {}) {
  const baseUrl = await getBackendUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'POST',
    credentials: 'include',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...getDeviceHeaders(),
      // Do NOT set Content-Type manually - fetch sets the multipart boundary itself.
    },
    body: formData,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(json?.message ?? `Request failed (${res.status})`, res.status, json);
  }

  return json;
}
