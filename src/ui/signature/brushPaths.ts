/**
 * §6.1 — the three brush shapes. They live apart from the component so the
 * BrushStroke module exports a component and nothing else.
 */
export const BRUSH_PATHS = [
  'M6 38 C46 14 132 6 226 9 C318 12 378 19 406 26 C416 29 414 45 402 50 C352 65 186 70 98 63 C50 59 12 51 6 38 Z',
  'M9 30 C60 10 140 4 232 8 C316 12 382 22 405 30 C414 33 408 48 396 52 C338 66 168 68 84 60 C42 56 10 44 9 30 Z',
  'M7 34 C52 16 128 8 220 10 C312 12 380 17 404 24 C415 27 411 47 398 51 C344 64 176 71 92 64 C46 60 11 47 7 34 Z',
];

/**
 * Deterministic variant from a string (normally the button's label), so the
 * same button always paints the same stroke but two buttons on one screen
 * differ — which is the point of having three (§6.1).
 */
export function pickBrushVariant(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % BRUSH_PATHS.length;
}
