import { useHasRole } from '@/features/auth/guards';
import { AdminDashboard } from './AdminDashboard';
import { ResidentDashboard } from './ResidentDashboard';

/**
 * Role-aware home: admins/committee get the society KPI dashboard; everyone
 * else (residents, etc.) gets their personal home dashboard.
 */
export function DashboardPage() {
  const isManager = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');
  return isManager ? <AdminDashboard /> : <ResidentDashboard />;
}
