import { useCallback, useState, type ReactNode } from 'react';
import { AuthContext, type Role, type Session } from './authStore';

/**
 * TEMP: fakes a login against a hardcoded table so frontend work isn't blocked
 * on the backend team's auth endpoint. Swap the body of `login` for a real
 * fetch('/api/auth/login') once that's ready — the shape of Session should stay
 * the same so nothing downstream needs to change.
 */
const FAKE_USERS: Record<string, { password: string; session: Session }> = {
  'riya@inovx.club': { password: 'demo', session: { name: 'Riya S.', initials: 'RS', role: 'super-admin' } },
  'arjun@inovx.club': { password: 'demo', session: { name: 'Arjun M.', initials: 'AM', role: 'admin' } },
  'member@inovx.club': { password: 'demo', session: { name: 'Ananya R.', initials: 'AR', role: 'member' } },
  'faculty@inovx.club': { password: 'demo', session: { name: 'Dr. Nair', initials: 'DN', role: 'faculty' } },
};

const SESSIONS_BY_ROLE: Record<Role, Session> = {
  member: FAKE_USERS['member@inovx.club'].session,
  admin: FAKE_USERS['arjun@inovx.club'].session,
  'super-admin': FAKE_USERS['riya@inovx.club'].session,
  faculty: FAKE_USERS['faculty@inovx.club'].session,
};

/**
 * TEMP (Phase 2): the shell needs a session to render, and Login is Phase 3.
 * Until then the app opens already signed in as whichever role was last picked
 * on /kitchen-sink. Phase 3 deletes this and starts at /login with no session.
 */
const ROLE_KEY = 'inovx.dev.role';

function seedSession(): Session {
  try {
    const stored = localStorage.getItem(ROLE_KEY) as Role | null;
    if (stored && stored in SESSIONS_BY_ROLE) return SESSIONS_BY_ROLE[stored];
  } catch {
    // Private mode or blocked site data — fall through to the default.
  }
  return SESSIONS_BY_ROLE.member;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(seedSession);

  const login = useCallback(async (email: string, password: string) => {
    const record = FAKE_USERS[email.trim().toLowerCase()];
    if (!record || record.password !== password) {
      // One message for both halves — never reveal which was wrong (§9.1).
      return { ok: false, error: 'Check your email and password.' };
    }
    setSession(record.session);
    return { ok: true, session: record.session };
  }, []);

  const logout = useCallback(() => setSession(null), []);

  const setRole = useCallback((role: Role) => {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch {
      // Not being able to remember the choice is survivable.
    }
    setSession(SESSIONS_BY_ROLE[role]);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}
