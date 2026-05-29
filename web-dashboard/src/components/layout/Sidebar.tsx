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
  Settings,
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

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Grouped navigation — mirrors the prototype's labelled sections
 * (Overview / Residents / Money / …) instead of one flat list. Each item
 * still respects its role gate; a group with no visible items is hidden.
 */
const GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Residents',
    items: [
      { to: '/properties', label: 'Properties', icon: Building2, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN'] },
      { to: '/users', label: 'People', icon: Users, roles: ['SOCIETY_ADMIN'] },
      { to: '/vehicles', label: 'Vehicles', icon: Car },
    ],
  },
  {
    label: 'Money',
    items: [{ to: '/billing', label: 'Billing', icon: Receipt, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER'] }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/gate', label: 'Gate & Security', icon: ShieldCheck },
      { to: '/staff', label: 'Staff & Help', icon: HardHat },
      { to: '/amenities', label: 'Amenities', icon: CalendarCheck },
    ],
  },
  {
    label: 'Community',
    items: [
      { to: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
      { to: '/notices', label: 'Notices', icon: Megaphone },
      { to: '/polls', label: 'Polls', icon: BarChart3 },
      { to: '/documents', label: 'Documents', icon: FolderLock },
    ],
  },
  {
    label: 'Emergency',
    items: [{ to: '/sos', label: 'Emergency', icon: Siren }],
  },
  {
    label: 'Configure',
    items: [{ to: '/settings', label: 'Settings', icon: Settings, roles: ['SOCIETY_ADMIN'] }],
  },
];

export function Sidebar() {
  const user = useSession((s) => s.user);
  const canSee = (item: NavItem) => !item.roles || item.roles.some((r) => user?.roles.includes(r));

  return (
    <aside className="flex w-[250px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface">
      <div className="mb-2 flex items-center gap-3 border-b border-line px-5 py-5">
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-gradient-to-br from-green to-green-dim font-display text-xl font-semibold text-acid-ink">
          S
        </div>
        <div>
          <h1 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">Societify</h1>
          <p className="text-xs text-faint">{user?.roles[0]?.replace(/_/g, ' ') ?? 'Member'}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4">
        {GROUPS.map((group) => {
          const items = group.items.filter(canSee);
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-1">
              <div className="px-3 pb-1.5 pt-3 text-[10.5px] uppercase tracking-[0.06em] text-faint">{group.label}</div>
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium transition',
                        isActive
                          ? 'bg-surface2 text-ink [&_svg]:text-green'
                          : 'text-muted hover:bg-surface2 hover:text-ink',
                      )
                    }
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
