import { cn } from '../../lib/cn';
import type { Deliverable } from '../../lib/tasks';
import { IconClose, IconExternal, IconWarning } from '../icons';
import './LinkChip.css';

/** A provider mark per §7.19. Line art, not a logo — we do not ship brand assets. */
const PROVIDER_LABEL: Record<Deliverable['provider'], string> = {
  drive: 'Drive',
  figma: 'Figma',
  github: 'GitHub',
  link: 'Link',
};

export interface LinkChipProps {
  deliverable: Deliverable;
  /** Renders a trailing ✕. Omit where the person may not edit deliverables. */
  onRemove?: (id: string) => void;
  className?: string;
}

/**
 * §7.19 — a deliverable link: provider mark, truncated label, external-link
 * glyph, chip styling, opens in a new tab.
 *
 * An unverifiable link carries a warning glyph, never an error (§9.8) — we
 * cannot actually see whether a file is shared, only that we could not confirm.
 */
export function LinkChip({ deliverable, onRemove, className }: LinkChipProps) {
  const { url, label, provider, shared } = deliverable;

  return (
    <span className={cn('link-chip', !shared && 'link-chip--unverified', className)}>
      <a
        className="link-chip__link"
        href={url}
        target="_blank"
        rel="noreferrer noopener"
      >
        <span className="link-chip__provider micro">{PROVIDER_LABEL[provider]}</span>
        <span className="link-chip__label">{label}</span>

        {!shared && (
          <span className="link-chip__warn" title="We couldn't confirm this link is open to anyone with it">
            <IconWarning />
            <span className="sr-only">Sharing not confirmed</span>
          </span>
        )}

        <span className="link-chip__glyph" aria-hidden="true"><IconExternal /></span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>

      {onRemove && (
        <button
          type="button"
          className="link-chip__remove"
          aria-label={`Remove ${label}`}
          onClick={() => onRemove(deliverable.id)}
        >
          <IconClose />
        </button>
      )}
    </span>
  );
}
