import { createContext, useContext } from 'react';
import type { PermissionKey } from '../lib/permissions';

/**
 * Roles decide the landing screen (§9.4–9.6) and the permission defaults.
 */
export type Role = 'member' | 'admin' | 'super-admin' | 'faculty';

export interface Session {
  name: string;
  initials: string;
  role: Role;
  /** Per-person overrides on top of the role defaults (§9.17). */
  grants?: PermissionKey[];
  revokes?: PermissionKey[];
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
  /**
   * TEMP (Phase 2 review only). Login is Phase 3, so there is no way to reach
   * the shell as a different role yet. The switcher on /kitchen-sink calls
   * this. Delete it along with FAKE_USERS when real auth lands.
   */
  setRole: (role: Role) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
