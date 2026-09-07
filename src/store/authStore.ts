import { createContext, useContext } from 'react';
import type { Role } from '../layouts/navConfig';
import type { PermissionKey } from '../lib/permissions/types';
import { resolveEffectivePermission } from '../lib/permissions/resolver';

export interface Session {
  userId?: string;
  name: string;
  initials: string;
  role: Role;
  domain?: string;
  permissions?: Record<string, boolean>;
  must_change_password?: boolean;
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

/**
 * Synchronous permission check helper for components across the app.
 * Usage: const { session } = useAuth(); if (can(session, 'task.approve')) { ... }
 *
 * Note: If session.permissions is populated (by backend), it takes precedence
 * even for super_admin, allowing temporary emergency revocation of permissions.
 */
export function can(session: Session | null, perm: PermissionKey): boolean {
  if (!session) return false;

  // Check explicit session permissions first (computed by backend, may include revokes)
  if (session.permissions && typeof session.permissions[perm] === 'boolean') {
    return session.permissions[perm];
  }

  // If no explicit session permissions, super_admin has all permissions
  if (session.role === 'super_admin') return true;

  // Fall back to role defaults
  return resolveEffectivePermission(session.role, undefined, perm);
}
