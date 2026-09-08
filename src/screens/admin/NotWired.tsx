import { Card, EmptyState } from '../../ui/patterns';
import { StickerCloudOff } from '../../ui/stickers';

export interface NotWiredProps {
  /** What the screen would show — "Occasion rules", "Integration health". */
  what: string;
  /** The table or endpoint it is waiting on, named so it is actionable. */
  needs: string;
}

/**
 * Stands in for a screen whose data has no home in the schema yet.
 *
 * Deliberately not an empty state: "no occasions" is a claim about the club,
 * and this is a statement about the software. Saying which table is missing
 * makes it a task for the backend rather than a mystery for the user.
 */
export function NotWired({ what, needs }: NotWiredProps) {
  return (
    <Card>
      <EmptyState
        sticker={<StickerCloudOff size="empty" />}
        title="Not wired up yet"
        line={`${what} needs somewhere to live before this screen can show anything`}
        detail={<p className="micro">Waiting on {needs}</p>}
      />
    </Card>
  );
}
