import { StickerFrame, type StickerProps } from './Sticker';

export { StickerFrame } from './Sticker';
export type { StickerProps, StickerSize } from './Sticker';

/** Empty board. */
export function StickerClipboard(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <rect x="14" y="10" width="36" height="46" rx="4" />
      <rect x="24" y="5" width="16" height="10" rx="3" />
      <path d="M22 28h20M22 36h20M22 44h12" />
    </StickerFrame>
  );
}

/** No occasions. */
export function StickerCalendar(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <rect x="9" y="14" width="46" height="42" rx="5" />
      <path d="M9 26h46M21 8v10M43 8v10" />
      <circle cx="23" cy="38" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="38" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="41" cy="46" r="2.5" fill="currentColor" stroke="none" />
    </StickerFrame>
  );
}

/** No notifications. */
export function StickerBell(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <path d="M18 44V30a14 14 0 0 1 28 0v14l4 6H14l4-6Z" />
      <path d="M27 50a5 5 0 0 0 10 0" />
      <path d="M32 12v4" />
    </StickerFrame>
  );
}

/** No permission — also the 403 screen and the login decoration. */
export function StickerLock(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <rect x="14" y="28" width="36" height="28" rx="5" />
      <path d="M22 28v-7a10 10 0 0 1 20 0v7" />
      <circle cx="32" cy="40" r="3.5" />
      <path d="M32 43.5V48" />
    </StickerFrame>
  );
}

/** Leaderboard. */
export function StickerTrophy(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <path d="M20 10h24v14a12 12 0 0 1-24 0V10Z" />
      <path d="M20 14h-7v4a8 8 0 0 0 8 8M44 14h7v4a8 8 0 0 1-8 8" />
      <path d="M32 36v10M24 54h16l-2-8H26l-2 8Z" />
    </StickerFrame>
  );
}

/** Nothing due today. */
export function StickerCoffee(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <path d="M14 24h32v18a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12V24Z" />
      <path d="M46 28h5a6 6 0 0 1 0 12h-5" />
      <path d="M24 8c0 4-3 4-3 8M34 8c0 4-3 4-3 8" />
    </StickerFrame>
  );
}

/** Onboarding complete. */
export function StickerRocket(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <path d="M32 6c8 7 12 16 12 26l-6 8H26l-6-8c0-10 4-19 12-26Z" />
      <circle cx="32" cy="26" r="4.5" />
      <path d="M26 40l-6 8 8-2M38 40l6 8-8-2M32 48v8" />
    </StickerFrame>
  );
}

/** Pinned announcement. */
export function StickerPin(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <path d="M32 38v18" />
      <path d="M22 8h20l-2.6 17.4 7.4 8a2.5 2.5 0 0 1-1.8 4.2H19a2.5 2.5 0 0 1-1.8-4.2l7.4-8L22 8Z" />
    </StickerFrame>
  );
}

/** Offline — also the 404 screen. */
export function StickerCloudOff(p: StickerProps) {
  return (
    <StickerFrame {...p}>
      <path d="M20 46h22a11 11 0 0 0 2-21.8A14 14 0 0 0 20 20" />
      <path d="M20 20a13 13 0 0 0 0 26" />
      <path d="M10 10l44 44" />
    </StickerFrame>
  );
}
