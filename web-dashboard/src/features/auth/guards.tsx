import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './session';
import type { SystemRole } from '@/lib/types';
import { Spinner } from '@/components/ui/Spinner';

/** Gate a route behind authentication (and optionally a set of roles). */
export function RequireAuth({ roles, children }: { roles?: SystemRole[]; children: ReactNode }) {
  const { user, ready } = useSession();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !user.roles.some((r) => roles.includes(r))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/** Convenience hook for conditional UI based on role. */
export function useHasRole(...roles: SystemRole[]): boolean {
  const user = useSession((s) => s.user);
  return Boolean(user?.roles.some((r) => roles.includes(r)));
}
