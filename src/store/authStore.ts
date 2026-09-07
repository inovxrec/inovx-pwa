import { createContext, useContext } from 'react';
import type { Role } from '../layouts/navConfig';
import { supabase } from '../lib/supabase';

export { supabase };

export interface Session {
  userId: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  domain: string | null;
  mustChangePassword: boolean;
  permissions: Record<string, boolean>;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  session?: Session;
}

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

export const AuthContext =
  createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider',
    );
  }

  return context;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export async function hydrateSession(
  userId: string,
): Promise<Session | null> {
  const { data: userRow, error } = await supabase
    .from('users')
    .select(
      'id, name, email, role, domain, must_change_password, status',
    )
    .eq('id', userId)
    .single();

  if (
    error ||
    !userRow ||
    userRow.status === 'deactivated'
  ) {
    return null;
  }

  const { data: perms, error: permsError } =
    await supabase.rpc(
      'effective_permissions_for_user',
      {
        p_user: userId,
      },
    );

  if (permsError) {
    console.warn(
      'Could not load permissions:',
      permsError.message,
    );
  }

  return {
    userId: userRow.id,
    name: userRow.name,
    initials: getInitials(userRow.name),
    email: userRow.email,
    role: userRow.role as Role,
    domain: userRow.domain,
    mustChangePassword:
      userRow.must_change_password,
    permissions:
      (perms ?? {}) as Record<string, boolean>,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

  if (error || !data.user) {
    throw new Error(
      error?.message ?? 'Login failed',
    );
  }

  const session = await hydrateSession(
    data.user.id,
  );

  if (!session) {
    await supabase.auth.signOut();

    throw new Error(
      'Account is deactivated or not provisioned correctly',
    );
  }

  return session;
}

export async function logout(): Promise<void> {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function changePassword(
  newPassword: string,
  userId: string,
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error(
      'Password must be at least 8 characters.',
    );
  }

  const { error: authError } =
    await supabase.auth.updateUser({
      password: newPassword,
    });

  if (authError) {
    throw new Error(authError.message);
  }

  const { error: rowError } =
    await supabase
      .from('users')
      .update({
        must_change_password: false,
      })
      .eq('id', userId);

  if (rowError) {
    throw new Error(rowError.message);
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<void> {
  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo:
          `${window.location.origin}/reset-password`,
      },
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function restoreSession(): Promise<
  Session | null
> {
  const { data, error } =
    await supabase.auth.getSession();

  if (
    error ||
    !data.session?.user
  ) {
    return null;
  }

  return hydrateSession(
    data.session.user.id,
  );
}