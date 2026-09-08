import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LANDING_BY_ROLE, NAV_ITEMS } from '../../lib/navConfig';
import { Button } from '../../ui/primitives/Button';
import { EmptyState } from '../../ui/patterns/EmptyState';
import { StickerCloudOff, StickerLock, StickerRocket } from '../../ui/stickers';
import './SystemScreens.css';

/*
  §9.18 system screens.

  Each one is a paper card on the ink ground, using the §7.16 EmptyState shape:
  sticker, display headline, one written line, at most one action.
*/

function SystemFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="system">
      <div className="system__card surface-paper">{children}</div>
    </div>
  );
}

/** 404 — also what an unauthorised route resolves to when we can't say why. */
export function NotFound() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const landing = session ? LANDING_BY_ROLE[session.role] : '/login';

  /*
    DEVIATION from §9.18, which fixes this label as "BACK TO MY DAY".
    Faculty have no My Day screen — it isn't in their nav at all (§9.6) — so
    that label would name a destination they cannot reach. The button names
    wherever it actually goes instead. Revert if the literal copy is wanted.
  */
  const landingLabel = NAV_ITEMS.find((item) => item.path === landing)?.label ?? 'my day';

  return (
    <SystemFrame>
      <EmptyState
        sticker={<StickerCloudOff size="empty" />}
        title="Nothing here"
        line="this page doesn't exist, or you don't have access to it"
        action={
          <Button variant="brush" onClick={() => navigate(landing)}>
            Back to {landingLabel}
          </Button>
        }
      />
    </SystemFrame>
  );
}

/** 403 — the person is signed in, but this board isn't theirs. */
export function Forbidden() {
  return (
    <SystemFrame>
      <EmptyState
        sticker={<StickerLock size="empty" />}
        title="Not your board"
        line="ask a super admin if you need access"
      />
    </SystemFrame>
  );
}

export interface ServerErrorProps {
  /** Shown in `micro` so someone can quote it when reporting the failure. */
  requestId?: string;
  onRetry?: () => void;
}

/** 500 — carries the request id, because "try again" alone is unreportable. */
export function ServerError({ requestId, onRetry }: ServerErrorProps) {
  return (
    <SystemFrame>
      <EmptyState
        sticker={<StickerRocket size="empty" />}
        title="Something broke"
        line="this one is on us, not on you"
        detail={requestId ? <p className="micro">Request {requestId}</p> : undefined}
        action={
          <Button variant="brush" onClick={onRetry ?? (() => window.location.reload())}>
            Try again
          </Button>
        }
      />
    </SystemFrame>
  );
}

/**
 * The router's error element. A thrown 403/404 renders the matching screen;
 * anything else is a 500, which is the honest reading of an unexpected throw.
 */
export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFound />;
    if (error.status === 403) return <Forbidden />;
  }

  const requestId =
    isRouteErrorResponse(error) && typeof error.data === 'string' ? error.data : undefined;

  return <ServerError requestId={requestId} />;
}
