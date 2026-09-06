import { EmptyState } from '../../ui/patterns/EmptyState';
import { StickerClipboard } from '../../ui/stickers';
import './Placeholder.css';

export interface PlaceholderProps {
  screen: string;
  /** Which build phase actually delivers this screen. */
  phase: string;
  /** The §9 section that specifies it. */
  section: string;
}

/**
 * TEMP (Phase 2). The shell needs somewhere to route to before the Phase 4–7
 * screens exist. Each of these is deleted as its real screen lands.
 */
export function Placeholder({ screen, phase, section }: PlaceholderProps) {
  return (
    <div className="placeholder surface-paper">
      <EmptyState
        sticker={<StickerClipboard size="empty" />}
        title={screen}
        line="this screen hasn't been built yet"
        detail={<p className="micro">{phase} · spec {section}</p>}
      />
    </div>
  );
}
