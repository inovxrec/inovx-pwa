import { useState, type ReactNode } from 'react';
import { AuthContext, type Session } from './authStore';

/**
 * TEMP: fakes a login against a hardcoded table so frontend work isn't
 * blocked on the backend team's auth endpoint. Swap the body of `login`
 * for a real fetch('/api/auth/login') once that's ready — the shape of
 * Session should stay the same so nothing downstream needs to change.
 *
 * Real Supabase Auth wiring is blocked pending Stream C provisioning real
 * auth.users rows — seed.sql only populates public.users, so there is
 * nobody to sign in as yet via supabase.auth.signInWithPassword().
 */
const FAKE_USERS: Record<string, { password: string; session: Session }> = {
  'riya@inovx.club': { password: 'demo', session: { name: 'Riya S.', initials: 'RS', role: 'admin' } },
  'member@inovx.club': { password: 'demo', session: { name: 'Ananya R.', initials: 'AR', role: 'member' } },
  'faculty@inovx.club': { password: 'demo', session: { name: 'Dr. Nair', initials: 'DN', role: 'faculty' } },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  async function login(email: string, password: string) {
    const record = FAKE_USERS[email.trim().toLowerCase()];
    if (!record || record.password !== password) {
      return { ok: false, error: 'ACCESS DENIED — CHECK YOUR EMAIL AND PASSWORD.' };
    }
    setSession(record.session);
    return { ok: true, session: record.session };
  }

  function logout() {
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
