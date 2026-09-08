import './OfflineBanner.css';

export interface OfflineBannerProps {
  /** When the last successful sync happened, e.g. "14:02". */
  lastSyncedAt?: string;
}

/**
 * §9.18 — a fixed strip below the header. It states what the person is looking
 * at and what happens to their edits, rather than just saying "offline".
 *
 * aria-live is polite: losing connection should not interrupt what someone is
 * typing.
 */
export function OfflineBanner({ lastSyncedAt }: OfflineBannerProps) {
  return (
    <div className="offline body-sm" role="status" aria-live="polite">
      Offline{lastSyncedAt ? ` — showing last synced ${lastSyncedAt}` : ''}. Changes will send when you reconnect.
    </div>
  );
}
