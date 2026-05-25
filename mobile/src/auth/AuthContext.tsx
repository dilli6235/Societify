import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { tokens } from '../lib/tokens';
import type { AuthUser, SystemRole } from '../lib/types';

interface LoginResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (societySlug: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: SystemRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On launch, restore the session from the stored refresh token.
  useEffect(() => {
    (async () => {
      await tokens.load();
      if (tokens.refresh) {
        try {
          const me = await api.get<AuthUser>('/auth/me'); // 401 -> auto refresh -> retry
          setUser(me);
        } catch {
          await tokens.clear();
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (societySlug: string, email: string, password: string) => {
    const result = await api.post<LoginResult>('/auth/login', {
      societySlug: societySlug || undefined,
      email,
      password,
    });
    await tokens.set(result.accessToken, result.refreshToken);
    setUser(result.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: tokens.refresh });
    } catch {
      // ignore network errors on logout
    }
    await tokens.clear();
    setUser(null);
  };

  const hasRole = (...roles: SystemRole[]) => Boolean(user?.roles.some((r) => roles.includes(r)));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
