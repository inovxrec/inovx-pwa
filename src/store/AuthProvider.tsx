import { useCallback, useState, type ReactNode } from 'react';
import { AuthContext, type Role, type Session } from './authStore';

/**
 * TEMP: fakes a login against a hardcoded table so frontend work isn't blocked
 * on the backend team's auth endpoint. Swap the body of `login` for a real
 * fetch('/api/auth/login') once that's ready — the shape of Session should stay
 * the same so nothing downstream needs to change.
 *
 * Every account here still holds the password the core team issued it, so each
 * one lands on /first-run the first time (§9.2). That flag is real state on the
 * server; here it is remembered per-email in localStorage so a reviewer isn't
 * walked through the same two screens on every reload.
 */
type Account = { password: string; person: Omit<Session, 'mustSetPassword' | 'hasOnboarded'> };

const FAKE_USERS: Record<string, Account> = {
  'riya@inovx.club': {
    password: 'demo',
    person: { email: 'riya@inovx.club', name: 'Riya S.', initials: 'RS', role: 'super-admin' },
  },
  'arjun@inovx.club': {
    password: 'demo',
    person: { email: 'arjun@inovx.club', name: 'Arjun M.', initials: 'AM', role: 'admin' },
  },
  'member@inovx.club': {
    password: 'demo',
    person: { email: 'member@inovx.club', name: 'Ananya R.', initials: 'AR', role: 'member' },
  },
  'faculty@inovx.club': {
    password: 'demo',
    person: { email: 'faculty@inovx.club', name: 'Dr. Nair', initials: 'DN', role: 'faculty' },
  },
};

/** §9.1 — five failures locks the account for fifteen minutes. */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const FLAGS_KEY = 'inovx.dev.entry';

type EntryFlags = Record<string, { passwordSet?: boolean; onboarded?: boolean }>;

function readFlags(): EntryFlags {
  try {
    return JSON.parse(localStorage.getItem(FLAGS_KEY) ?? '{}') as EntryFlags;
  } catch {
    // Private mode, blocked site data, or a value from an older shape.
    return {};
  }
}

function writeFlag(email: string, patch: EntryFlags[string]) {
  try {
    const all = readFlags();
    localStorage.setItem(FLAGS_KEY, JSON.stringify({ ...all, [email]: { ...all[email], ...patch } }));
  } catch {
    // Not being able to remember it is survivable — the flow just repeats.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // No seeded session: the app opens at /login (§9.1).
  const [session, setSession] = useState<Session | null>(null);

  // Attempt counting is per browser here; the server owns it for real.
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const login = useCallback(
    async (email: string, password: string) => {
      if (Date.now() < lockedUntil) return { ok: false, error: 'Locked for 15 minutes.' };

      const key = email.trim().toLowerCase();
      const account = FAKE_USERS[key];

      if (!account || account.password !== password) {
        const next = failures + 1;
        setFailures(next);
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          return { ok: false, error: 'Locked for 15 minutes.' };
        }
        // One message for both halves — never reveal which was wrong (§9.1).
        return { ok: false, error: 'Check your email and password.' };
      }

      const flags = readFlags()[key] ?? {};
      const next: Session = {
        ...account.person,
        mustSetPassword: !flags.passwordSet,
        hasOnboarded: Boolean(flags.onboarded),
      };

      setFailures(0);
      setSession(next);
      return { ok: true, session: next };
    },
    [failures, lockedUntil],
  );

  const logout = useCallback(() => setSession(null), []);

  const setPassword = useCallback(async (_password: string) => {
    setSession((current) => {
      if (!current) return current;
      writeFlag(current.email, { passwordSet: true });
      return { ...current, mustSetPassword: false };
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      writeFlag(current.email, { onboarded: true });
      return { ...current, hasOnboarded: true };
    });
  }, []);

  const setRole = useCallback((role: Role) => {
    const account = Object.values(FAKE_USERS).find((a) => a.person.role === role);
    if (!account) return;
    setSession({ ...account.person, mustSetPassword: false, hasOnboarded: true });
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, login, logout, setPassword, completeOnboarding, setRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}
