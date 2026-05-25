import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  ShieldCheck,
  CalendarCheck,
  MessageSquareWarning,
  Megaphone,
  BarChart3,
  Car,
  HardHat,
  FolderLock,
  Siren,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/cn';
import type { SystemRole } from '@/lib/types';
import { useSession } from '@/features/auth/session';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles?: SystemRole[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/properties', label: 'Properties', icon: Building2, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN'] },
  { to: '/users', label: 'People', icon: Users, roles: ['SOCIETY_ADMIN'] },
  { to: '/billing', label: 'Billing', icon: Receipt, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER'] },
  { to: '/gate', label: 'Gate & Security', icon: ShieldCheck },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/staff', label: 'Staff & Help', icon: HardHat },
  { to: '/amenities', label: 'Amenities', icon: CalendarCheck },
  { to: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/notices', label: 'Notices', icon: Megaphone },
  { to: '/polls', label: 'Polls', icon: BarChart3 },
  { to: '/documents', label: 'Documents', icon: FolderLock },
  { to: '/sos', label: 'Emergency', icon: Siren },
];

export function Sidebar() {
  const user = useSession((s) => s.user);
  const visible = NAV.filter((item) => !item.roles || item.roles.some((r) => user?.roles.includes(r)));

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-slate-900">Societify</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visible.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
