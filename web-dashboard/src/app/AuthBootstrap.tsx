import { useEffect, type ReactNode } from 'react';
import { bootstrapSession } from '@/features/auth/api';

/** Attempt to restore the session from the refresh cookie before rendering. */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    void bootstrapSession();
  }, []);
  return <>{children}</>;
}
