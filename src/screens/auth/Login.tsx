import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LANDING_BY_ROLE } from '../../lib/navConfig';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
import { AuthFrame } from './AuthFrame';
import './Login.css';

/**
 * §9.1 — the first impression. One paper card on the ink ground.
 *
 * There is no signup link on this screen or anywhere in the app: accounts are
 * issued by the core team.
 */
export function Login() {
  const { session, login, requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  /**
   * Sends the link, and says the same thing either way.
   *
   * "We have sent one if that address has an account" reads as evasive, and is
   * the point: a form that said "no such account" would hand an attacker a way
   * to test which of the club's addresses are real, which is exactly what the
   * single sign-in error above refuses to do.
   */
  async function sendReset() {
    const address = email.trim();
    if (!address) {
      setError('Enter your email first.');
      return;
    }

    setResetting(true);
    setError(null);
    try {
      await requestPasswordReset(address);
    } catch {
      // Deliberately not surfaced — see above.
    } finally {
      setResetting(false);
      setResetSent(true);
    }
  }

  // Already signed in — nothing to do here. The gates downstream decide whether
  // that means first run, the tour, or the landing screen.
  if (session) {
    const to = session.mustSetPassword
      ? '/first-run'
      : session.hasOnboarded
        ? LANDING_BY_ROLE[session.role]
        : '/welcome';
    return <Navigate to={to} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result = await login(email, password);

    setBusy(false);
    if (!result.ok || !result.session) {
      setError(result.error ?? 'Check your email and password.');
      return;
    }

    navigate(
      result.session.mustSetPassword
        ? '/first-run'
        : result.session.hasOnboarded
          ? LANDING_BY_ROLE[result.session.role]
          : '/welcome',
      { replace: true },
    );
  }

  return (
    /*
      DEVIATION from §9.1, which puts a display-1 "INOVX OPS" under the logo
      (§9.1.3) and the "internal system · accounts are issued by the core team"
      line under the card (§9.1.5). Both were asked to be removed: the wordmark
      already says INOVX, and the second line told a member something they
      cannot act on.

      The heading stays in the document, unseen — the screen still needs one h1
      (§11), and the logo above it is an image.
    */
    <AuthFrame title="INOVX Ops" titleHidden tagline="the club's own system">
      <form className="login__form" onSubmit={onSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="login__password">
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/*
            DEVIATION from §9.1.4, which places "Forgot password" between the
            password field and the button. Sat there it separates the field from
            its own error message. It keeps the same right alignment, one row up.
          */}
          <div className="login__forgot">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showReset}
              aria-controls="login-reset"
              onClick={() => setShowReset((v) => !v)}
            >
              Forgot password
            </Button>
          </div>

          {/*
            A real reset now that there is somewhere for the email to come from.
            It stays in place rather than becoming its own screen: the address is
            already typed above, and §15 says not to invent a screen for it.
          */}
          {showReset && (
            <div id="login-reset" className="login__reset">
              {resetSent ? (
                <p className="body-sm">
                  If that address has an account, a link is on its way. It lets
                  you set a new password and expires after an hour.
                </p>
              ) : (
                <>
                  <p className="body-sm">
                    We will email a link to set a new one.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={resetting}
                    onClick={() => void sendReset()}
                  >
                    Send the link
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/*
          The message sits above the button, inside the card (§9.1). It is
          assertive because it is the result of the person's own submit.
        */}
        {error && (
          <p className="login__error body-sm" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="brush" fullWidth loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthFrame>
  );
}
