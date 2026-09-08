import { createContext, useContext } from 'react';
import type { PermissionKey } from '../lib/permissions';
import type { Domain } from '../lib/tasks';

/**
 * Roles decide the landing screen (§9.4–9.6) and the permission defaults.
 *
 * The database spells the third one `super_admin`; it is translated at the edge
 * in `lib/db/map.ts` so only that file has to know.
 */
export type Role = 'member' | 'admin' | 'super-admin' | 'faculty';

export interface Session {
  /** The auth user's id — the key everything else in the database hangs off. */
  userId: string;
  email: string;
  name: string;
  initials: string;
  role: Role;
  /** The person's own domain, for defaults and for their avatar's colour. */
  domain: Domain;
  /** Per-person overrides on top of the role defaults (§9.17). */
  grants?: PermissionKey[];
  revokes?: PermissionKey[];
  /** The issued password has not been changed, so /first-run is unavoidable. */
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
  /**
   * False until the stored session has been checked. Without it the app would
   * show the login screen for a frame to someone who is already signed in.
   */
  ready: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  /** Completes §9.2 and lets the person out of /first-run. */
  setPassword: (password: string) => Promise<void>;
  /** Completes §9.3, whether the tour was finished or skipped. */
  completeOnboarding: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
