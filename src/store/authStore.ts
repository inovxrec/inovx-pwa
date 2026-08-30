import { createContext, useContext } from 'react';
import type { Role } from '../layouts/navConfig';

export interface Session {
  name: string;
  initials: string;
  role: Role;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  session?: Session;
}

export interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
