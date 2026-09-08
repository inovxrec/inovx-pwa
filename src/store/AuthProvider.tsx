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
      /*
        Arriving from a reset link. The session is real but only meant for
        setting a password, so the person is put on /first-run regardless of
        what their profile says — `mustSetPassword` is what that screen gates on.
      */
      if (event === 'PASSWORD_RECOVERY') {
        void loadProfile(next.user.id, next.user.email ?? '')
          .then(() => setSession((current) => (current ? { ...current, mustSetPassword: true } : current)))
          .catch(() => setSession(null));
        return;
      }

      /*
        USER_UPDATED is this tab changing its own credentials — `setPassword`
        already knows the outcome and has written the profile itself. Reloading
        here would race that write and read back the flag it just cleared,
        putting the person straight back on /first-run with a password that has
        already changed. A credential is not a profile; nothing to re-read.
      */
      if (event === 'USER_UPDATED') return;

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

  /**
   * §9.2 — replaces the issued password, then records that it has been replaced.
   *
   * Both halves have to succeed. The credential lives in auth.users and the flag
   * that decides whether /first-run is still owed lives in public.users, and a
   * person whose password changed but whose flag did not is locked out of their
   * own account: the issued password no longer works, and the app keeps sending
   * them back here. So the flag write is awaited and its failure is raised —
   * it used to be fired and forgotten from inside a setState updater, where its
   * error had nowhere to go and React was free to run it twice or not at all.
   */
  const setPassword = useCallback(async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error('Your session expired. Sign in again to set a password.');

    const { error: flagError } = await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('id', userId);

    if (flagError) throw flagError;

    setSession((current) => (current ? { ...current, mustSetPassword: false } : current));
  }, []);

  /**
   * Emails a link that signs the person in long enough to set a new password.
   *
   * Supabase returns the same result for an unknown address, and this passes
   * that through rather than reporting it: the sign-in form deliberately refuses
   * to say which half was wrong, and a reset form that leaked the answer would
   * undo that.
   */
  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      // Lands back in the app; the recovery event below routes them onward.
      redirectTo: `${window.location.origin}/first-run`,
    });
    if (error) throw error;
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
      value={{
        session, ready, login, logout, setPassword, requestPasswordReset, completeOnboarding,
      }}
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
