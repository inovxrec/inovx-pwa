import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
  Generates the PWA icon set §2 asks for.

  §2 says to generate these FROM public/brand/inovx-logo.png. That file is not
  in the repo, so this draws the "X" app mark §2 itself falls back to below
  88px, on the --ink ground, in --paper. It is a placeholder and looks like one.

  When the real logo lands, replace this script's drawing with a decode of the
  PNG — the sizes, padding and file names below are the ones §2 specifies and
  should not change.

  Written by hand rather than with a canvas library so the repo gains no
  dependency for something that runs once.
*/

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');

const INK = [0x0b, 0x0b, 0x0b];
const PAPER = [0xf4, 0xef, 0xe0];
const FLAME = [0xef, 0x4e, 0x24];

/** CRC32, as the PNG spec defines it. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** `pixels` is a size×size array of [r,g,b]. */
function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  // One filter byte (0 = none) per scanline, then RGB triples.
  const raw = Buffer.alloc(size * (1 + size * 3));
  let at = 0;
  for (let y = 0; y < size; y += 1) {
    raw[at] = 0;
    at += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixels[y * size + x];
      raw[at] = r;
      raw[at + 1] = g;
      raw[at + 2] = b;
      at += 3;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The X mark: two diagonal bands, with the second in flame the way the real
 * wordmark's X carries a second colour.
 *
 * `inset` is the fraction of the canvas left clear around the mark — 0.2 for
 * the maskable icon, which §2 requires to survive a circular crop.
 */
function drawMark(size, inset) {
  const pixels = new Array(size * size);
  const pad = size * inset;
  const span = size - pad * 2;
  const stroke = span * 0.19;
  const half = stroke / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Normalised inside the mark's own box, so the padding stays empty.
      const u = (x - pad) / span;
      const v = (y - pad) / span;

      let colour = INK;

      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const t = half / span;
        // Distance from each diagonal, in the mark's own units.
        const down = Math.abs(u - v) / Math.SQRT2;
        const up = Math.abs(u + v - 1) / Math.SQRT2;

        if (down < t) colour = PAPER;
        else if (up < t) colour = FLAME;
      }

      pixels[y * size + x] = colour;
    }
  }

  return pixels;
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, inset: 0.12 },
  { file: 'icon-512.png', size: 512, inset: 0.12 },
  // §2: the maskable icon is the mark centred with 20% safe padding.
  { file: 'icon-maskable-512.png', size: 512, inset: 0.2 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.14 },
  { file: 'favicon-32.png', size: 32, inset: 0.08 },
];

mkdirSync(OUT, { recursive: true });

for (const target of TARGETS) {
  writeFileSync(join(OUT, target.file), png(target.size, drawMark(target.size, target.inset)));
  console.log(`wrote public/icons/${target.file} (${target.size}px)`);
}
