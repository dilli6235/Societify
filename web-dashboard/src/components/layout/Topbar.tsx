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
    <header className="flex h-16 items-center justify-end gap-3 border-b border-slate-200 bg-white px-6">
      <NotificationsBell />
      <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
          <p className="text-xs text-slate-400">{user?.roles[0]?.replace(/_/g, ' ')}</p>
        </div>
        <button
          onClick={async () => {
            await logout.mutateAsync();
            navigate('/login', { replace: true });
          }}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
