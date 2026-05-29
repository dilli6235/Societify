import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/features/auth/session';
import { useLogout } from '@/features/auth/api';
import { NotificationsBell } from './NotificationsBell';

export function Topbar() {
  const user = useSession((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();

  const initials = user?.fullName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-end gap-3 border-b border-line bg-surface px-6">
      <NotificationsBell />
      <div className="flex items-center gap-3 border-l border-line pl-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface3 text-sm font-semibold text-green">
          {initials}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-ink">{user?.fullName}</p>
          <p className="text-xs text-faint">{user?.roles[0]?.replace(/_/g, ' ')}</p>
        </div>
        <button
          onClick={async () => {
            await logout.mutateAsync();
            navigate('/login', { replace: true });
          }}
          className="rounded-lg p-2 text-faint hover:bg-surface2 hover:text-ink"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
