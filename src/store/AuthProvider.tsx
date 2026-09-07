import { useEffect, useState, type ReactNode } from 'react';

import {
  AuthContext,
  hydrateSession,
  login as loginWithSupabase,
  logout as logoutFromSupabase,
  restoreSession,
  supabase,
  type Session,
} from './authStore';

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const restored =
          await restoreSession();

        if (mounted) {
          setSession(restored);
        }
      } catch (error) {
        console.error(
          'Failed to restore session:',
          error,
        );

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void restore();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, authSession) => {
        if (!mounted) return;

        if (!authSession?.user) {
          setSession(null);
          setLoading(false);
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          void hydrateSession(
            authSession.user.id,
          )
            .then((hydrated) => {
              if (mounted) {
                setSession(hydrated);
              }
            })
            .catch((error) => {
              console.error(
                'Failed to hydrate session:',
                error,
              );

              if (mounted) {
                setSession(null);
              }
            })
            .finally(() => {
              if (mounted) {
                setLoading(false);
              }
            });
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(
    email: string,
    password: string,
  ) {
    try {
      const nextSession =
        await loginWithSupabase(
          email,
          password,
        );

      setSession(nextSession);

      return {
        ok: true,
        session: nextSession,
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Login failed',
      };
    }
  }

  async function logout() {
    try {
      await logoutFromSupabase();
    } finally {
      setSession(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}