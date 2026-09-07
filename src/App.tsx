import { useCallback, useState } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/AuthProvider';
import { TaskProvider } from './store/taskStore';
import { CommitteeProvider } from './store/committeeStore';
import { GrantProvider } from './store/grantStore';
import { ToastProvider } from './hooks/useToast';
import { useAuth, type Session } from './store/authStore';
import { usePermissionCheck } from './hooks/usePermission';
import { LANDING_BY_ROLE } from './lib/navConfig';
import type { PermissionKey } from './lib/permissions';
import { AppShell, type RouteHandle } from './ui/nav';
import { UpdatePrompt } from './ui/nav/UpdatePrompt';
import { LogoIntro } from './ui/brand/LogoIntro';
import { KitchenSink } from './screens/kitchen-sink/KitchenSink';
import { Login } from './screens/auth/Login';
import { FirstRun } from './screens/auth/FirstRun';
import { Welcome } from './screens/onboarding/Welcome';
import { MyDay } from './screens/my-day/MyDay';
import { Board } from './screens/board/Board';
import { TaskDetail } from './screens/task/TaskDetail';
import { CommandDeck } from './screens/deck/CommandDeck';
import { OversightDeck } from './screens/oversight/OversightDeck';
import { Insights } from './screens/insights/Insights';
import { Calendar } from './screens/calendar/Calendar';
import { People } from './screens/people/People';
import { Meetings, MeetingDetail } from './screens/meetings/Meetings';
import { Notifications } from './screens/notifications/Notifications';
import { Settings } from './screens/settings/Settings';
import { ADMIN_SCREENS, AdminShell } from './screens/admin/AdminFrame';
import { AdminMembers } from './screens/admin/AdminMembers';
import { AdminPermissions } from './screens/admin/AdminPermissions';
import { AdminOccasions } from './screens/admin/AdminOccasions';
import { AdminRecurring } from './screens/admin/AdminRecurring';
import { AdminApprovals } from './screens/admin/AdminApprovals';
import { AdminIntegrations } from './screens/admin/AdminIntegrations';
import { AdminArchive } from './screens/admin/AdminArchive';
import { AdminAudit } from './screens/admin/AdminAudit';
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
/**
 * §9.15's eight screens, each gated on its own key. A person who holds one key
 * reaches that screen and nothing else; /admin itself sends them to the first
 * one they may actually see.
 */
const adminRoutes = [
  { path: 'members', element: <Require permission="admin.members"><AdminMembers /></Require> },
  { path: 'permissions', element: <Require permission="admin.permissions"><AdminPermissions /></Require> },
  { path: 'occasions', element: <Require permission="admin.occasions"><AdminOccasions /></Require> },
  { path: 'recurring', element: <Require permission="admin.recurring"><AdminRecurring /></Require> },
  { path: 'approvals', element: <Require permission="admin.approvals"><AdminApprovals /></Require> },
  { path: 'integrations', element: <Require permission="admin.integrations"><AdminIntegrations /></Require> },
  { path: 'archive', element: <Require permission="admin.archive"><AdminArchive /></Require> },
  { path: 'audit', element: <Require permission="admin.audit"><AdminAudit /></Require> },
];

/** Sends /admin to whichever of the eight this person can actually open. */
function AdminIndex() {
  const can = usePermissionCheck();
  const first = ADMIN_SCREENS.find((screen) => can(screen.permission));
  return first ? <Navigate to={first.path} replace /> : <Forbidden />;
}

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
          // ---------- PHASE 7 ----------
          {
            path: '/admin',
            handle: { title: 'Admin' } satisfies RouteHandle,
            element: <AdminShell />,
            children: [
              { index: true, element: <AdminIndex /> },
              ...adminRoutes,
            ],
          },

          // ---------- PHASE 6 ----------
          {
            path: '/calendar',
            handle: { title: 'Calendar' } satisfies RouteHandle,
            element: <Calendar />,
          },
          {
            path: '/people',
            handle: { title: 'People' } satisfies RouteHandle,
            element: <People />,
          },
          {
            path: '/meetings',
            handle: { title: 'Meetings' } satisfies RouteHandle,
            element: <Require permission="meetings.view"><Meetings /></Require>,
          },
          {
            path: '/meetings/:id',
            handle: { title: 'Meeting', back: true } satisfies RouteHandle,
            element: <Require permission="meetings.view"><MeetingDetail /></Require>,
          },
          {
            path: '/notifications',
            handle: { title: 'Alerts' } satisfies RouteHandle,
            element: <Notifications />,
          },
          {
            path: '/settings',
            handle: { title: 'Settings' } satisfies RouteHandle,
            element: <Settings />,
          },

          // ---------- PHASE 5 ----------
          {
            path: '/deck',
            handle: { title: 'Deck' } satisfies RouteHandle,
            element: <CommandDeck />,
          },
          {
            path: '/oversight',
            handle: { title: 'Oversight' } satisfies RouteHandle,
            element: <OversightDeck />,
          },
          {
            path: '/insights',
            handle: { title: 'Insights' } satisfies RouteHandle,
            element: <Require permission="analytics.view"><Insights /></Require>,
          },

          // ---------- PHASE 4 ----------
          {
            path: '/my-day',
            handle: { title: 'My day' } satisfies RouteHandle,
            element: <MyDay />,
          },
          // /board lands on the first board the person can see.
          // /board lands on every domain's work at once, not one domain's.
          {
            path: '/board',
            element: <Navigate to="/board/all" replace />,
          },
          {
            path: '/board/:slug',
            handle: { title: 'Board' } satisfies RouteHandle,
            element: <Require permission="board.view"><Board /></Require>,
          },
          {
            path: '/committee/:id',
            handle: { title: 'Committee' } satisfies RouteHandle,
            element: <Require permission="board.view"><Board /></Require>,
          },
          {
            path: '/task/:id',
            handle: { title: 'Task' } satisfies RouteHandle,
            element: <TaskDetail />,
          },

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
  /*
    The opening title runs on every load of the document — which is what
    "opening the app" means for an installed PWA — and not on client-side
    navigation. The app renders underneath it the whole time, so nothing is
    waiting on the animation to finish.
  */
  const [introDone, setIntroDone] = useState(false);
  const dismiss = useCallback(() => setIntroDone(true), []);

  return (
    <AuthProvider>
      <TaskProvider>
        <CommitteeProvider>
          <GrantProvider>
            <ToastProvider>
              <UpdatePrompt />
              {!introDone && <LogoIntro onDone={dismiss} />}
              <RouterProvider router={router} />
            </ToastProvider>
          </GrantProvider>
        </CommitteeProvider>
      </TaskProvider>
    </AuthProvider>
  );
}
