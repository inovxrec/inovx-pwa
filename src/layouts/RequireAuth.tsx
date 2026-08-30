import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
