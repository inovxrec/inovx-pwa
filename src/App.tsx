import { Suspense, lazy, useCallback, useState } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/AuthProvider';
import { TaskProvider } from './store/taskStore';
import { ClubProvider } from './store/ClubProvider';
import { ToastProvider } from './hooks/useToast';
import { useAuth, type Session } from './store/authStore';
import { usePermissionCheck } from './hooks/usePermission';
import { LANDING_BY_ROLE } from './lib/navConfig';
import type { PermissionKey } from './lib/permissions';
import { AppShell, type RouteHandle } from './ui/nav';
import { UpdatePrompt } from './ui/nav/UpdatePrompt';
import { LogoIntro } from './ui/brand/LogoIntro';
import { Login } from './screens/auth/Login';
import { FirstRun } from './screens/auth/FirstRun';
import { ADMIN_SCREENS, AdminShell } from './screens/admin/AdminFrame';
import { Forbidden, NotFound, RouteError, ServerError } from './screens/system/SystemScreens';

/*
  Everything past the front door is fetched when it is first opened.

  These used to be static imports, which meant one bundle carrying every screen
  in the app: someone looking at the sign-in form downloaded the admin section,
  the charts and the kitchen sink before they could type their email. On college
  wifi that is the difference between the app feeling instant and feeling broken.

  Login and FirstRun stay eager on purpose — they are the first thing anyone
  sees, and a spinner in front of a password field to save a few kilobytes would
  be a worse trade.
*/
const KitchenSink = lazy(() => import('./screens/kitchen-sink/KitchenSink').then((m) => ({ default: m.KitchenSink })));
const Welcome = lazy(() => import('./screens/onboarding/Welcome').then((m) => ({ default: m.Welcome })));
const MyDay = lazy(() => import('./screens/my-day/MyDay').then((m) => ({ default: m.MyDay })));
const Board = lazy(() => import('./screens/board/Board').then((m) => ({ default: m.Board })));
const TaskDetail = lazy(() => import('./screens/task/TaskDetail').then((m) => ({ default: m.TaskDetail })));
const CommandDeck = lazy(() => import('./screens/deck/CommandDeck').then((m) => ({ default: m.CommandDeck })));
const OversightDeck = lazy(() => import('./screens/oversight/OversightDeck').then((m) => ({ default: m.OversightDeck })));
const Insights = lazy(() => import('./screens/insights/Insights').then((m) => ({ default: m.Insights })));
const Calendar = lazy(() => import('./screens/calendar/Calendar').then((m) => ({ default: m.Calendar })));
const People = lazy(() => import('./screens/people/People').then((m) => ({ default: m.People })));
const Meetings = lazy(() => import('./screens/meetings/Meetings').then((m) => ({ default: m.Meetings })));
const MeetingDetail = lazy(() => import('./screens/meetings/Meetings').then((m) => ({ default: m.MeetingDetail })));
const Notifications = lazy(() => import('./screens/notifications/Notifications').then((m) => ({ default: m.Notifications })));
const Settings = lazy(() => import('./screens/settings/Settings').then((m) => ({ default: m.Settings })));

// The eight admin screens, which only a handful of people ever open.
const AdminMembers = lazy(() => import('./screens/admin/AdminMembers').then((m) => ({ default: m.AdminMembers })));
const AdminPermissions = lazy(() => import('./screens/admin/AdminPermissions').then((m) => ({ default: m.AdminPermissions })));
const AdminOccasions = lazy(() => import('./screens/admin/AdminOccasions').then((m) => ({ default: m.AdminOccasions })));
const AdminRecurring = lazy(() => import('./screens/admin/AdminRecurring').then((m) => ({ default: m.AdminRecurring })));
const AdminApprovals = lazy(() => import('./screens/admin/AdminApprovals').then((m) => ({ default: m.AdminApprovals })));
const AdminIntegrations = lazy(() => import('./screens/admin/AdminIntegrations').then((m) => ({ default: m.AdminIntegrations })));
const AdminArchive = lazy(() => import('./screens/admin/AdminArchive').then((m) => ({ default: m.AdminArchive })));
const AdminAudit = lazy(() => import('./screens/admin/AdminAudit').then((m) => ({ default: m.AdminAudit })));

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

/*
  Nothing at all until the stored session has been checked.

  `ready` exists precisely for this moment, and the gates below used to ignore
  it: on a cold load `session` is null for a beat, so every guard fired, sent
  the person to /login, and the landing redirect then forwarded them to their
  own home screen. The address they actually asked for was lost on the way —
  which broke every deep link in the app, including the one a push notification
  opens.

  A blank frame is the right thing to render here. It lasts one tick, and the
  alternative is a login screen that flashes at someone who is already signed
  in.
*/
function AwaitingSession() {
  return <div className="app-booting" aria-busy="true" aria-live="polite" />;
}

function LandingRedirect() {
  const { session, ready } = useAuth();
  if (!ready) return <AwaitingSession />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={destinationFor(session)} replace />;
}

/**
 * The shell's gate. No session goes to login; an unfinished entry flow goes
 * back to the step it is on, which is what makes /first-run unavoidable (§9.2).
 */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  if (!ready) return <AwaitingSession />;
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
      <ClubProvider>
        <TaskProvider>
          <ToastProvider>
            <UpdatePrompt />
            {!introDone && <LogoIntro onDone={dismiss} />}
            {/*
              One boundary around the router, because every screen below is a
              lazy chunk and React needs somewhere to wait. The fallback is the
              same ink ground the shell paints on, so a screen arriving reads as
              the page filling in rather than as a flash of something else.
            */}
            <Suspense fallback={<AwaitingSession />}>
              <RouterProvider router={router} />
            </Suspense>
          </ToastProvider>
        </TaskProvider>
      </ClubProvider>
    </AuthProvider>
  );
}
