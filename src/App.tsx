import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthProvider';
import { useAuth } from './store/authStore';
import { ToastProvider } from './components/Toast';
import { TaskProvider } from './store/taskStore';
import { RequireAuth } from './layouts/RequireAuth';
import { AuthedShell } from './layouts/AuthedShell';
import { Login } from './features/auth/Login';
import { MyDay } from './features/myday/MyDay';
import { CommandDeck } from './features/command-deck/CommandDeck';
import { OversightDeck } from './features/oversight-deck/OversightDeck';
import { Board } from './features/board/Board';
import { TaskDetail } from './features/task-detail/TaskDetail';
import { Calendar } from './features/calendar/Calendar';
import { People } from './features/people/People';
import { Permissions } from './features/permissions/Permissions';
import { Notifications } from './features/notifications/Notifications';
import { Meetings } from './features/meetings/Meetings';
import { AttendanceAnalytics } from './features/analytics/AttendanceAnalytics';
import { IosInstallPrompt } from './features/pwa/IosInstallPrompt';

/** Sends a signed-in user straight past /login if they land there again. */
function LoginRoute() {
  const { session } = useAuth();
  if (session) return <Navigate to="/myday" replace />;
  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<RequireAuth><AuthedShell /></RequireAuth>}>
        <Route path="/myday" element={<MyDay />} />
        <Route path="/deck" element={<CommandDeck />} />
        <Route path="/oversight" element={<OversightDeck />} />
        <Route path="/board" element={<Board />} />
        <Route path="/board/:taskId" element={<TaskDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/analytics" element={<AttendanceAnalytics />} />
        <Route path="/people" element={<People />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <TaskProvider>
            <AppRoutes />
            <IosInstallPrompt />
          </TaskProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
