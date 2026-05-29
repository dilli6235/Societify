import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth, useHasRole } from '@/features/auth/guards';
import { LoginPage } from '@/features/auth/LoginPage';
import { AcceptInvitePage } from '@/features/auth/AcceptInvitePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { FlatDetailPage } from '@/features/properties/FlatDetailPage';
import { UsersPage } from '@/features/users/UsersPage';
import { BillingPage } from '@/features/billing/BillingPage';
import { GatePage } from '@/features/gate/GatePage';
import { AmenitiesPage } from '@/features/amenities/AmenitiesPage';
import { ComplaintsPage } from '@/features/complaints/ComplaintsPage';
import { NoticesPage } from '@/features/notices/NoticesPage';
import { PollsPage } from '@/features/polls/PollsPage';
import { VehiclesPage } from '@/features/vehicles/VehiclesPage';
import { StaffPage } from '@/features/staff/StaffPage';
import { DocumentsPage } from '@/features/documents/DocumentsPage';
import { SosPage } from '@/features/sos/SosPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PlatformLayout } from '@/features/platform/PlatformLayout';
import { PlatformOverviewPage } from '@/features/platform/OverviewPage';
import { PlatformSocietiesPage } from '@/features/platform/SocietiesPage';
import { PlatformPlansPage } from '@/features/platform/PlansPage';

/** Super admins have no society — send them to the platform console. */
function SocietyShell() {
  const isSuper = useHasRole('SUPER_ADMIN');
  return isSuper ? <Navigate to="/platform" replace /> : <AppLayout />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    path: '/platform',
    element: (
      <RequireAuth roles={['SUPER_ADMIN']}>
        <PlatformLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <PlatformOverviewPage /> },
      { path: 'societies', element: <PlatformSocietiesPage /> },
      { path: 'plans', element: <PlatformPlansPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <SocietyShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'properties', element: <PropertiesPage /> },
      { path: 'flats/:id', element: <FlatDetailPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'gate', element: <GatePage /> },
      { path: 'vehicles', element: <VehiclesPage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'amenities', element: <AmenitiesPage /> },
      { path: 'complaints', element: <ComplaintsPage /> },
      { path: 'notices', element: <NoticesPage /> },
      { path: 'polls', element: <PollsPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'sos', element: <SosPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
