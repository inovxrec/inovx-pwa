import { createContext, useContext } from 'react';
import type { PermissionKey } from '../lib/permissions';

/**
 * Roles decide the landing screen (§9.4–9.6) and the permission defaults.
 */
export type Role = 'member' | 'admin' | 'super-admin' | 'faculty';

export interface Session {
  /** The account identity — also the key the entry flags are stored under. */
  email: string;
  name: string;
  initials: string;
  role: Role;
  /** Per-person overrides on top of the role defaults (§9.17). */
  grants?: PermissionKey[];
  revokes?: PermissionKey[];
  /**
   * The core team issued this password and it has not been changed yet, so
   * /first-run is unavoidable until it is (§9.2).
   */
  mustSetPassword: boolean;
  /** Has been through the four-slide tour (§9.3). */
  hasOnboarded: boolean;
}

export interface LoginResult {
  ok: boolean;
  /** The one message shown for both halves, or the lockout line (§9.1). */
  error?: string;
  session?: Session;
}

export interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  /** Completes §9.2 and lets the person out of /first-run. */
  setPassword: (password: string) => Promise<void>;
  /** Completes §9.3, whether the tour was finished or skipped. */
  completeOnboarding: () => void;
  /**
   * TEMP (review only). Jumps straight into the shell as another role without
   * signing out. The switcher on /kitchen-sink calls this. Delete it along with
   * FAKE_USERS when the real auth endpoint lands.
   */
  setRole: (role: Role) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
