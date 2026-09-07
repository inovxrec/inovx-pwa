import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { NOT_CONFIGURED, describeError, isConfigured, supabase } from '../lib/supabase';
import { fetchProfile } from '../lib/db/queries';
import { toDomain, toRole } from '../lib/db/map';
import { AuthContext, type Session } from './authStore';

/**
 * Real authentication, against Supabase.
 *
 * The account lives in `auth.users` and its profile — role, domain, position,
 * whether the issued password has been changed — mirrors into the public
 * `users` table. Signing in gets the first; the session the app works with
 * needs both, so the profile is fetched straight after.
 *
 * Nothing here decides what anyone may do. Row level security does that; the
 * role below only chooses which screens are worth offering (§12).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isConfigured);

  /** Builds the app's session from an auth user id. */
  const loadProfile = useCallback(async (userId: string, email: string) => {
    const profile = await fetchProfile(userId);

    if (!profile) {
      /*
        Authenticated but with no profile row. That is a provisioning fault, not
        a login the app can carry on with — a session with no role would be
        given a member's screens by default, which is a guess about access.
      */
      await supabase.auth.signOut();
      throw new Error('Your account has no profile yet. Ask the core team to finish setting it up.');
    }

    const next: Session = {
      email: profile.email || email,
      name: profile.name,
      initials:
        profile.initials ??
        profile.name.split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase(),
      role: toRole(profile.role),
      mustSetPassword: profile.must_change_password,
      // Onboarding is a client-side courtesy; the schema does not track it.
      hasOnboarded: readOnboarded(profile.email || email),
      userId: profile.id,
      domain: toDomain(profile.domain),
    };

    setSession(next);
    return next;
  }, []);

  // Restore an existing session on load, and follow sign-in/out from anywhere.
  useEffect(() => {
    if (!isConfigured) return;

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        const user = data.session?.user;
        if (user) await loadProfile(user.id, user.email ?? '').catch(() => setSession(null));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT' || !next?.user) {
        setSession(null);
        return;
      }
      // SIGNED_IN also fires on a token refresh; reloading the profile then is
      // cheap and keeps a role change from needing a reload to take effect.
      void loadProfile(next.user.id, next.user.email ?? '').catch(() => setSession(null));
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!isConfigured) return { ok: false, error: NOT_CONFIGURED };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) {
        /*
          One message for both halves (§9.1). Supabase distinguishes a wrong
          password from an unknown address; passing that through would tell an
          attacker which emails are real.
        */
        const rateLimited = error?.status === 429;
        return {
          ok: false,
          error: rateLimited ? 'Too many attempts. Try again shortly.' : 'Check your email and password.',
        };
      }

      try {
        const next = await loadProfile(data.user.id, data.user.email ?? email);
        return { ok: true, session: next };
      } catch (caught) {
        return { ok: false, error: describeError(caught) };
      }
    },
    [loadProfile],
  );

  const logout = useCallback(() => {
    void supabase.auth.signOut();
    setSession(null);
  }, []);

  const setPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    setSession((current) => {
      if (!current) return current;
      // The flag is the server's, so it is cleared there too.
      void supabase.from('users').update({ must_change_password: false }).eq('id', current.userId);
      return { ...current, mustSetPassword: false };
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      writeOnboarded(current.email);
      return { ...current, hasOnboarded: true };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, ready, login, logout, setPassword, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/*
  Whether someone has seen the tour is a preference, not a fact about the club,
  and the schema has nowhere for it. It lives in this browser, keyed by email so
  two people sharing a machine do not inherit each other's.
*/
const ONBOARDED_KEY = 'inovx.onboarded';

function readOnboarded(email: string): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(ONBOARDED_KEY) ?? '{}') as Record<string, boolean>;
    return Boolean(raw[email]);
  } catch {
    return false;
  }
}

function writeOnboarded(email: string): void {
  try {
    const raw = JSON.parse(localStorage.getItem(ONBOARDED_KEY) ?? '{}') as Record<string, boolean>;
    localStorage.setItem(ONBOARDED_KEY, JSON.stringify({ ...raw, [email]: true }));
  } catch {
    // Private mode. The tour shows again, which is survivable.
  }
}
