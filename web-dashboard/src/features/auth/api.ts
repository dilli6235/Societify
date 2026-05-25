import { useMutation } from '@tanstack/react-query';
import { http, post } from '@/lib/apiClient';
import type { ApiSuccess, AuthUser } from '@/lib/types';
import { useSession } from './session';

interface LoginInput {
  societySlug?: string;
  email: string;
  password: string;
}

interface LoginResult {
  user: AuthUser;
  accessToken: string;
}

export function useLogin() {
  const setSession = useSession((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => post<LoginResult>('/auth/login', input),
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

export function useLogout() {
  const clear = useSession((s) => s.clear);
  return useMutation({
    mutationFn: () => http.post('/auth/logout', {}),
    onSettled: () => clear(),
  });
}

/** Try to restore a session from the refresh cookie on app load. */
export async function bootstrapSession(): Promise<void> {
  const { setSession, setReady, clear } = useSession.getState();
  try {
    const res = await http.post<ApiSuccess<LoginResult>>('/auth/refresh', {});
    const { accessToken } = res.data.data;
    // Hydrate the access token, then fetch the full profile.
    useSession.getState().setAccessToken(accessToken);
    const me = await http.get<ApiSuccess<AuthUser>>('/auth/me');
    setSession(accessToken, me.data.data);
  } catch {
    clear();
  } finally {
    setReady(true);
  }
}
