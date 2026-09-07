/**
 * Where each letter sits inside the wordmark.
 *
 * Measured off `public/inovx-wordmark-light.webp` by scanning its columns for
 * the empty gutters between glyphs, not by eye. If the asset is ever replaced,
 * remeasure rather than nudge these.
 */
export const WORDMARK = { src: '/inovx-wordmark-light.webp', width: 561, height: 198 };

export interface Glyph {
  letter: string;
  /** Left edge in the source's own pixels. */
  x: number;
  /** Width in the source's own pixels. */
  w: number;
}

export const GLYPHS: Glyph[] = [
  { letter: 'I', x: 0, w: 50 },
  { letter: 'N', x: 63, w: 112 },
  { letter: 'O', x: 193, w: 97 },
  { letter: 'V', x: 306, w: 112 },
  { letter: 'X', x: 422, w: 139 },
];

/** The trailing X — the app mark, and what the intro lands on. */
export const X_GLYPH = GLYPHS[GLYPHS.length - 1];

/**
 * The CSS custom properties that crop one glyph out of the full wordmark.
 *
 * A box of the glyph's own aspect with the whole image inside it, scaled so the
 * image's height matches the box and shifted left by the glyph's offset. Every
 * length is derived from one height variable, so a consumer sets that alone.
 */
export function glyphVars(glyph: Glyph): React.CSSProperties {
  return {
    '--glyph-w': glyph.w,
    '--glyph-x': glyph.x,
  } as React.CSSProperties;
}
