import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/AuthProvider';
import { useAuth } from './store/authStore';
import { usePermissionCheck } from './hooks/usePermission';
import { LANDING_BY_ROLE, NAV_ITEMS } from './lib/navConfig';
import type { PermissionKey } from './lib/permissions';
import { AppShell, type RouteHandle } from './ui/nav';
import { KitchenSink } from './screens/kitchen-sink/KitchenSink';
import { Placeholder } from './screens/placeholder/Placeholder';
import { Forbidden, NotFound, RouteError, ServerError } from './screens/system/SystemScreens';

/**
 * Sends each role to its own landing screen — §9.4 My Day for members, §9.5 the
 * Command Deck for admins, §9.6 the Oversight Deck for faculty.
 */
function LandingRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={LANDING_BY_ROLE[session.role]} replace />;
}

/**
 * Route-level gate. A missing session goes to login; a missing permission
 * renders the 403 screen rather than a blank page, so the person is told why.
 *
 * This is a courtesy, not security — the server decides (§12).
 */
function Require({
  permission,
  children,
}: {
  permission?: PermissionKey;
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const can = usePermissionCheck();

  if (!session) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) return <Forbidden />;
  return <>{children}</>;
}

/** Which phase and spec section each placeholder is standing in for. */
const PENDING: Record<string, { screen: string; phase: string; section: string; permission?: PermissionKey }> = {
  'my-day': { screen: 'My day', phase: 'Phase 4', section: '§9.4' },
  deck: { screen: 'Command deck', phase: 'Phase 5', section: '§9.5' },
  oversight: { screen: 'Oversight deck', phase: 'Phase 5', section: '§9.6' },
  board: { screen: 'Boards', phase: 'Phase 4', section: '§9.7', permission: 'board.view' },
  calendar: { screen: 'Calendar', phase: 'Phase 6', section: '§9.9' },
  people: { screen: 'People', phase: 'Phase 6', section: '§9.10' },
  meetings: { screen: 'Meetings', phase: 'Phase 6', section: '§9.11', permission: 'meetings.view' },
  insights: { screen: 'Insights', phase: 'Phase 5', section: '§9.12', permission: 'analytics.view' },
  notifications: { screen: 'Alerts', phase: 'Phase 6', section: '§9.13' },
  admin: { screen: 'Admin', phase: 'Phase 7', section: '§9.15', permission: 'admin.members' },
  settings: { screen: 'Settings', phase: 'Phase 6', section: '§9.14' },
};

/** Every nav destination, wired to its placeholder and its title. */
const shellRoutes = NAV_ITEMS.map((item) => {
  const pending = PENDING[item.id];
  return {
    path: item.path,
    handle: { title: item.label } satisfies RouteHandle,
    element: (
      <Require permission={pending.permission}>
        <Placeholder screen={pending.screen} phase={pending.phase} section={pending.section} />
      </Require>
    ),
  };
});

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LandingRedirect /> },

      // Phase 1's review surface. Outside the shell — it is not a product screen.
      { path: 'kitchen-sink', element: <KitchenSink /> },

      {
        element: <AppShell />,
        children: [
          ...shellRoutes,
          // Reachable directly so the states can be reviewed before the screens
          // that throw them exist.
          { path: '403', handle: { title: 'No access' }, element: <Forbidden /> },
          { path: '500', handle: { title: 'Error' }, element: <ServerError requestId="req_8f21c0" /> },
          { path: '*', handle: { title: 'Not found' }, element: <NotFound /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
