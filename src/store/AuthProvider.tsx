import { useState, type ReactNode } from 'react';
import { AuthContext, type Session } from './authStore';

/**
 * TEMP: fakes a login against a hardcoded table so frontend work isn't
 * blocked on the backend team's auth endpoint. Swap the body of `login`
 * for a real fetch('/api/auth/login') once that's ready — the shape of
 * Session should stay the same so nothing downstream needs to change.
 */
const FAKE_USERS: Record<string, { password: string; session: Session }> = {
  'varun@inovx.club': { password: 'demo', session: { userId: 'usr_varun', name: 'Varun Sharma', initials: 'VS', role: 'super_admin', domain: 'core' } },
  'sanjeev@inovx.club': { password: 'demo', session: { userId: 'usr_sanjeev', name: 'Sanjeev Varma', initials: 'SV', role: 'admin', domain: 'technical' } },
  'riya@inovx.club': { password: 'demo', session: { userId: 'usr_riya', name: 'Riya S.', initials: 'RS', role: 'member', domain: 'design' } },
  'member@inovx.club': { password: 'demo', session: { userId: 'usr_ananya', name: 'Ananya R.', initials: 'AR', role: 'member', domain: 'media' } },
  'faculty@inovx.club': { password: 'demo', session: { userId: 'usr_faculty', name: 'Dr. Radhakrishnan', initials: 'RK', role: 'faculty', domain: 'core' } },
  'faculty@rec.ac.in': { password: 'demo', session: { userId: 'usr_faculty', name: 'Dr. Radhakrishnan', initials: 'RK', role: 'faculty', domain: 'core' } },
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
