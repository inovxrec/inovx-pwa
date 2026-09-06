import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LANDING_BY_ROLE } from '../../lib/navConfig';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { AuthFrame } from './AuthFrame';
import './FirstRun.css';

/**
 * The twenty most-used passwords, lowercased. The real check belongs on the
 * server against a proper breach list — this is the client's courtesy copy so
 * the checklist can answer live, and it is never the thing that decides.
 */
const COMMON = new Set([
  '123456', 'password', '123456789', '12345678', '12345', '111111', '1234567',
  'sunshine', 'qwerty', 'iloveyou', 'princess', 'admin', 'welcome', '666666',
  'abc123', 'football', '123123', 'monkey', '654321', 'password123',
  'qwerty123', 'letmein', 'inovx', 'inovx123',
]);

interface Rule {
  id: string;
  /** Written as a fact about the password, so the tick reads as "true". */
  label: string;
  passes: (value: string) => boolean;
}

const RULES: Rule[] = [
  { id: 'length', label: 'At least 10 characters', passes: (v) => v.length >= 10 },
  {
    id: 'common',
    label: 'Not a commonly used password',
    passes: (v) => v.length > 0 && !COMMON.has(v.trim().toLowerCase()),
  },
];

/** An outline circle until it passes, then a filled --st-done tick (§9.2). */
function RuleItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className={passed ? 'firstrun__rule firstrun__rule--ok' : 'firstrun__rule'}>
      <span className="firstrun__mark" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle className="firstrun__ring" cx="10" cy="10" r="8" />
          <path className="firstrun__tick" d="M6 10.5l2.8 2.8L14.5 7.5" />
        </svg>
      </span>
      <span className="body-sm">{label}</span>
      <span className="sr-only">{passed ? ' — met' : ' — not met yet'}</span>
    </li>
  );
}

/**
 * §9.2 — reached immediately after the first login and unavoidable until it is
 * completed. No navigation, no back, no escape, and the nav chrome is not
 * rendered on this route at all.
 */
export function FirstRun() {
  const { session, setPassword } = useAuth();
  const navigate = useNavigate();

  const [password, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  if (!session) return <Navigate to="/login" replace />;
  // Already done — this route must not be re-enterable.
  if (!session.mustSetPassword) {
    return <Navigate to={session.hasOnboarded ? LANDING_BY_ROLE[session.role] : '/welcome'} replace />;
  }

  const results = RULES.map((rule) => ({ ...rule, passed: rule.passes(password) }));
  const matches = confirm.length > 0 && confirm === password;
  const valid = results.every((r) => r.passed) && matches;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    await setPassword(password);
    setBusy(false);
    navigate('/welcome', { replace: true });
  }

  return (
    <AuthFrame title="Set your password" size="display-2">
      <form className="firstrun__form" onSubmit={onSubmit} noValidate>
        <Input
          label="New password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setValue(e.target.value)}
        />

        <Input
          label="Confirm password"
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm.length > 0 && !matches ? 'These two do not match.' : undefined}
        />

        {/*
          Polite, not assertive: the list updates on every keystroke and should
          not interrupt what the person is typing.
        */}
        <ul className="firstrun__rules" role="list" aria-live="polite">
          {results.map((rule) => (
            <RuleItem key={rule.id} label={rule.label} passed={rule.passed} />
          ))}
        </ul>

        <Button type="submit" variant="brush" fullWidth disabled={!valid} loading={busy}>
          Continue
        </Button>
      </form>
    </AuthFrame>
  );
}
