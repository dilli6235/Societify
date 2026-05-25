import { API_URL } from '../config';
import { tokens } from './tokens';

/** Build headers, identifying as a mobile client + attaching the access token. */
function headers(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
    ...extra,
  };
  if (tokens.access) h.Authorization = `Bearer ${tokens.access}`;
  return h;
}

// Single shared in-flight refresh, like the web client.
let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!tokens.refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refreshToken: tokens.refresh }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    await tokens.set(json.data.accessToken, json.data.refreshToken ?? tokens.refresh);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string> | undefined) },
  });

  if (res.status === 401 && allowRetry && !path.startsWith('/auth/')) {
    refreshing ??= doRefresh().finally(() => {
      refreshing = null;
    });
    if (await refreshing) return request<T>(path, options, false);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as { error?: { message?: string } })?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return (json as { data: T }).data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};
