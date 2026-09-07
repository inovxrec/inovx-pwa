import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../components/Panel';
import { Button } from '../../components/Button';
import { useAuth } from '../../store/authStore';
import './Login.css';

const LANDING_BY_ROLE = { super_admin: '/deck', member: '/myday', admin: '/deck', faculty: '/oversight' } as const;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok || !result.session) {
      setError(result.error ?? 'Something went wrong. Try again.');
      return;
    }
    navigate(LANDING_BY_ROLE[result.session.role]);
  }

  return (
    <div className="login-wrap">
      <Panel bracket bracketColor="var(--chan-core)" className="login-panel">
        <div className="login-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="21" width="28" height="20" stroke="var(--chan-core)" strokeWidth="2" />
            <path d="M16 21V15C16 9.477 20.03 6 24 6C27.97 6 32 9.477 32 15V21" stroke="var(--chan-core)" strokeWidth="2" />
            <circle cx="24" cy="29" r="2.6" fill="var(--chan-core)" />
            <path d="M24 31.6V35.5" stroke="var(--chan-core)" strokeWidth="2" strokeLinecap="square" />
          </svg>
        </div>
        <div className="login-word">INOVX84</div>

        {error && <div className="login-error">&gt; {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="text"
              placeholder="you@inovx.club"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" variant="primary" style={{ width: '100%', height: 40 }} disabled={submitting}>
            {submitting ? 'Checking…' : 'Log in'}
          </Button>
        </form>

        <div className="login-under"><a href="#forgot">Forgot password</a></div>
        <div className="login-foot">&gt; INTERNAL SYSTEM — ACCOUNTS ARE ISSUED BY THE CORE TEAM</div>
      </Panel>
    </div>
  );
}
