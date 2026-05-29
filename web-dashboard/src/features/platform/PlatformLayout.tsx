import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Building2, CreditCard, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSession } from '@/features/auth/session';
import { useLogout } from '@/features/auth/api';

const NAV = [
  { to: '/platform', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/platform/societies', label: 'Societies', icon: Building2 },
  { to: '/platform/plans', label: 'Plans', icon: CreditCard },
];

export function PlatformLayout() {
  const location = useLocation();
  const user = useSession((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface text-ink">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green to-green-dim text-acid-ink">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold leading-tight">Societify</div>
            <div className="text-xs text-faint">Platform admin</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-surface2 text-ink [&_svg]:text-green' : 'text-muted hover:bg-surface2 hover:text-ink',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-end gap-3 border-b border-line bg-surface px-6">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-ink">{user?.fullName}</p>
            <p className="text-xs text-faint">Super Admin</p>
          </div>
          <button
            onClick={async () => { await logout.mutateAsync(); navigate('/login', { replace: true }); }}
            className="rounded-lg p-2 text-faint hover:bg-surface2 hover:text-ink"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto bg-bg p-6">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
