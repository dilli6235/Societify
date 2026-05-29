import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useSession } from '@/features/auth/session';
import type { ApiError, ApiSuccess, PaginationMeta } from './types';

/**
 * Axios instance pointed at the API. `withCredentials` so the httpOnly refresh
 * cookie travels with /auth requests. The short-lived access token lives only
 * in memory (the session store) and is attached per-request below.
 */
export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = useSession.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Transparent access-token refresh on 401 ──────────────────────────────
// A single in-flight refresh is shared by all concurrent 401s.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await http.post<ApiSuccess<{ accessToken: string }>>('/auth/refresh', {});
    const token = res.data.data.accessToken;
    useSession.getState().setAccessToken(token);
    return token;
  } catch {
    useSession.getState().clear();
    return null;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';
    const isAuthCall = url.includes('/auth/refresh') || url.includes('/auth/login');

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Pull a human message out of an axios error for toasts. */
export function errorMessage(err: unknown): string {
  const ax = err as AxiosError<ApiError>;
  return ax.response?.data?.error?.message ?? ax.message ?? 'Something went wrong';
}

// ── Thin typed helpers over the envelope ──────────────────────────────────

export async function getOne<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.get<ApiSuccess<T>>(url, { params });
  return res.data.data;
}

export async function getList<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<{ items: T[]; meta?: PaginationMeta }> {
  const res = await http.get<ApiSuccess<T[]>>(url, { params });
  return { items: res.data.data, meta: res.data.meta };
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.post<ApiSuccess<T>>(url, body);
  return res.data.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.patch<ApiSuccess<T>>(url, body);
  return res.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const res = await http.delete<ApiSuccess<T>>(url);
  return res.data.data;
}

/**
 * Download a binary response (e.g. a PDF) through the authenticated client and
 * save it with the given filename. The Bearer token is attached by the request
 * interceptor, so this works for routes that a plain `window.open` couldn't.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await http.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
