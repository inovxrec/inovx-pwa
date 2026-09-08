import type { ReactNode } from 'react';

/*
  UI icons — line art at a 1.75px stroke, drawn on a 24px grid in currentColor.

  Not in the §12 folder list, but §1.2 bans emoji as icons and the §6.2 stickers
  are illustrations rather than UI glyphs, so the nav needs its own set. Every
  icon here is decorative: the label beside it, or the aria-label on an icon
  button, carries the meaning.
*/

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** My Day. */
export const IconSun = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </Icon>
);

/** Command Deck. */
export const IconDeck = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
  </Icon>
);

/** Oversight Deck — read-only. */
export const IconEye = () => (
  <Icon>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.75" />
  </Icon>
);

/** Boards. */
export const IconBoard = () => (
  <Icon>
    <rect x="3" y="4" width="4.5" height="16" rx="1.5" />
    <rect x="9.75" y="4" width="4.5" height="11" rx="1.5" />
    <rect x="16.5" y="4" width="4.5" height="14" rx="1.5" />
  </Icon>
);

export const IconCalendar = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);

export const IconPeople = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.5a3.25 3.25 0 0 1 0 6.4M17.5 14.5a6.5 6.5 0 0 1 4 5.5" />
  </Icon>
);

export const IconMeetings = () => (
  <Icon>
    <path d="M3 5.5h18v11H8l-5 4v-15Z" />
    <path d="M8 10h8M8 13h5" />
  </Icon>
);

/** Insights. */
export const IconChart = () => (
  <Icon>
    <path d="M3 21h18" />
    <path d="M6 21V11M11 21V4M16 21v-6M21 21v-9" />
  </Icon>
);

export const IconBell = () => (
  <Icon>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 3H4l2-3Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Icon>
);

export const IconSettings = () => (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1Z" />
  </Icon>
);

/** Admin. */
export const IconShield = () => (
  <Icon>
    <path d="M12 2.5l8 3v6c0 5-3.4 9.1-8 10.5-4.6-1.4-8-5.5-8-10.5v-6l8-3Z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

/** The 5th bottom-bar item, always. */
export const IconMore = () => (
  <Icon>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconSearch = () => (
  <Icon>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  </Icon>
);

export const IconChevronLeft = () => (
  <Icon>
    <path d="M15 4l-8 8 8 8" />
  </Icon>
);

export const IconClose = () => (
  <Icon>
    <path d="M5 5l14 14M19 5L5 19" />
  </Icon>
);

export const IconCloudOff = () => (
  <Icon>
    <path d="M7 18h11a4 4 0 0 0 .9-7.9A7 7 0 0 0 7.5 6.5" />
    <path d="M7 8a5 5 0 0 0 0 10" />
    <path d="M3 3l18 18" />
  </Icon>
);

/* ---------- PHASE 4 ---------- */

export const IconChevronDown = () => (
  <Icon>
    <path d="M5 9l7 7 7-7" />
  </Icon>
);

export const IconChevronRight = () => (
  <Icon>
    <path d="M9 4l8 8-8 8" />
  </Icon>
);

export const IconPlus = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

/** The `⋯` overflow trigger on a card or a task header. */
export const IconEllipsis = () => (
  <Icon>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);

/** Trailing glyph on a LinkChip — the link leaves the app. */
export const IconExternal = () => (
  <Icon>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Icon>
);

/** A deliverable link we could not confirm is open to anyone with it. */
export const IconWarning = () => (
  <Icon>
    <path d="M12 4.5L21 19.5H3L12 4.5Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconCheck = () => (
  <Icon>
    <path d="M4.5 12.5l5 5L20 7" />
  </Icon>
);

/** Filter bar trigger. */
export const IconFilter = () => (
  <Icon>
    <path d="M3 6h18M7 12h10M10 18h4" />
  </Icon>
);
