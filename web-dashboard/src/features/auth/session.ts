import { create } from 'zustand';
import type { AuthUser } from '@/lib/types';

/**
 * In-memory session: the access token never touches localStorage (XSS-safe).
 * On a hard refresh it's gone, and the app silently re-establishes it from the
 * httpOnly refresh cookie via /auth/refresh (see <AuthBootstrap/>).
 */
interface SessionState {
  accessToken: string | null;
  user: AuthUser | null;
  ready: boolean; // bootstrap completed (refresh attempt finished)
  setAccessToken: (token: string | null) => void;
  setSession: (token: string, user: AuthUser) => void;
  setReady: (ready: boolean) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  ready: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: (accessToken, user) => set({ accessToken, user }),
  setReady: (ready) => set({ ready }),
  clear: () => set({ accessToken: null, user: null }),
}));
