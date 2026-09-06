import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/AuthProvider';
import { TaskProvider } from './store/taskStore';
import { ToastProvider } from './hooks/useToast';
import { useAuth, type Session } from './store/authStore';
import { usePermissionCheck } from './hooks/usePermission';
import { LANDING_BY_ROLE, NAV_ITEMS } from './lib/navConfig';
import type { PermissionKey } from './lib/permissions';
import { BOARDS } from './lib/mockTasks';
import { AppShell, type RouteHandle } from './ui/nav';
import { KitchenSink } from './screens/kitchen-sink/KitchenSink';
import { Placeholder } from './screens/placeholder/Placeholder';
import { Login } from './screens/auth/Login';
import { FirstRun } from './screens/auth/FirstRun';
import { Welcome } from './screens/onboarding/Welcome';
import { MyDay } from './screens/my-day/MyDay';
import { Board } from './screens/board/Board';
import { TaskDetail } from './screens/task/TaskDetail';
import { Forbidden, NotFound, RouteError, ServerError } from './screens/system/SystemScreens';

/**
 * Where a signed-in person belongs right now. The entry flow is a queue: set
 * the issued password (§9.2), then the tour (§9.3), then the role's own landing
 * screen (§9.4–9.6). Every gate reads this so they cannot disagree.
 */
function destinationFor(session: Session): string {
  if (session.mustSetPassword) return '/first-run';
  if (!session.hasOnboarded) return '/welcome';
  return LANDING_BY_ROLE[session.role];
}

function LandingRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={destinationFor(session)} replace />;
}

/**
 * The shell's gate. No session goes to login; an unfinished entry flow goes
 * back to the step it is on, which is what makes /first-run unavoidable (§9.2).
 */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;

  const destination = destinationFor(session);
  if (destination === '/first-run' || destination === '/welcome') {
    return <Navigate to={destination} replace />;
  }
  return <>{children}</>;
}

/**
 * Route-level permission gate. A missing permission renders the 403 screen
 * rather than a blank page, so the person is told why.
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
  const can = usePermissionCheck();
  if (permission && !can(permission)) return <Forbidden />;
  return <>{children}</>;
}

/** Which phase and spec section each placeholder is standing in for. */
const PENDING: Record<string, { screen: string; phase: string; section: string; permission?: PermissionKey }> = {
  deck: { screen: 'Command deck', phase: 'Phase 5', section: '§9.5' },
  oversight: { screen: 'Oversight deck', phase: 'Phase 5', section: '§9.6' },
  calendar: { screen: 'Calendar', phase: 'Phase 6', section: '§9.9' },
  people: { screen: 'People', phase: 'Phase 6', section: '§9.10' },
  meetings: { screen: 'Meetings', phase: 'Phase 6', section: '§9.11', permission: 'meetings.view' },
  insights: { screen: 'Insights', phase: 'Phase 5', section: '§9.12', permission: 'analytics.view' },
  notifications: { screen: 'Alerts', phase: 'Phase 6', section: '§9.13' },
  admin: { screen: 'Admin', phase: 'Phase 7', section: '§9.15', permission: 'admin.members' },
  settings: { screen: 'Settings', phase: 'Phase 6', section: '§9.14' },
};

/**
 * The nav destinations that are still placeholders. My Day and Boards have
 * shipped (Phase 4) and are declared explicitly below.
 */
const shellRoutes = NAV_ITEMS.filter((item) => PENDING[item.id]).map((item) => {
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

      // The entry flow (§9.1–9.3). No nav chrome renders on any of these.
      { path: 'login', element: <Login /> },
      { path: 'first-run', element: <FirstRun /> },
      { path: 'welcome', element: <Welcome /> },

      // Phase 1's review surface. Outside the shell — it is not a product screen.
      { path: 'kitchen-sink', element: <KitchenSink /> },

      {
        element: (
          <RequireSession>
            <AppShell />
          </RequireSession>
        ),
        children: [
          // ---------- PHASE 4 ----------
          {
            path: '/my-day',
            handle: { title: 'My day' } satisfies RouteHandle,
            element: <MyDay />,
          },
          // /board lands on the first board the person can see.
          {
            path: '/board',
            element: <Require permission="board.view"><BoardIndex /></Require>,
          },
          {
            path: '/board/:slug',
            handle: { title: 'Board' } satisfies RouteHandle,
            element: <Require permission="board.view"><Board /></Require>,
          },
          {
            path: '/task/:id',
            handle: { title: 'Task' } satisfies RouteHandle,
            element: <TaskDetail />,
          },

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

/** §9.7's board index — there is no all-boards screen, so pick the first one. */
function BoardIndex() {
  return <Navigate to={`/board/${BOARDS[0].slug}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </TaskProvider>
    </AuthProvider>
  );
}
