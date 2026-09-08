import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
  Generates the PWA icon set §2 asks for, from the real wordmark.

  Run it, open http://localhost:4190 in a browser, and it writes the five files
  into public/icons. Node cannot decode WebP without a dependency and the
  browser already can, so the rasterising happens there and the bytes come back
  here to be written.

  Nothing about this ships: the page is served from memory, not from public/.

  Rerun it whenever public/inovx-wordmark-light.webp changes. The sizes, the
  padding and the file names below are the ones §2 specifies — those should not
  change.
*/

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');
const SOURCE = 'inovx-wordmark-light.webp';
const PORT = 4190;

/*
  Which icons show the whole wordmark and which show the X alone.

  §2 says to generate all of these from the logo, and separately that below 88px
  the X glyph alone is the app mark. The home-screen and tab sizes render small
  enough that a 2.8:1 wordmark inside them is an illegible strip, so they take
  the X; the large sizes, which are used for splash screens and listings, take
  the full mark.
*/
const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><title>INOVX icons</title></head>
<body style="background:#222;color:#ccc;font:14px system-ui;padding:24px">
<p id="status">Generating…</p>
<div id="preview"></div>
<script>
const INK = '#0B0B0B';
/* The X is the trailing glyph. Measured from the source's glyph gutters. */
const X_CROP = { x: 422, y: 0, w: 139, h: 198 };

const TARGETS = [
  /*
    The favicon alone is transparent, not on the ink ground. A tab strip has
    its own colour and the browser theme changes it, so a black tile sits in it
    as a visible square; the glyph on its own reads on either.
  */
  { file: 'favicon-32.png', size: 32, inset: 0.06, crop: true, transparent: true },
  { file: 'icon-192.png', size: 192, inset: 0.14, crop: true },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.14, crop: true },
  { file: 'icon-512.png', size: 512, inset: 0.1, crop: false },
  /* §2: the maskable icon is the logo centred with 20% safe padding. */
  { file: 'icon-maskable-512.png', size: 512, inset: 0.2, crop: false },
];

function render(img, size, inset, crop, transparent) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');

  if (!transparent) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, size, size);
  }

  const sx = crop ? X_CROP.x : 0;
  const sy = crop ? X_CROP.y : 0;
  const sw = crop ? X_CROP.w : img.naturalWidth;
  const sh = crop ? X_CROP.h : img.naturalHeight;

  const box = size * (1 - inset * 2);
  const scale = Math.min(box / sw, box / sh);
  const w = sw * scale, h = sh * scale;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

const img = new Image();
img.onerror = () => { document.getElementById('status').textContent = 'Could not load /${SOURCE}'; };
img.onload = async () => {
  const files = {};
  for (const t of TARGETS) {
    const canvas = render(img, t.size, t.inset, t.crop, t.transparent);
    files[t.file] = canvas.toDataURL('image/png').split(',')[1];
    canvas.style.cssText = 'margin:8px;max-width:128px;border:1px solid #555';
    document.getElementById('preview').append(canvas);
  }
  const res = await fetch('/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(files),
  });
  const body = await res.json();
  document.getElementById('status').textContent = 'Wrote: ' + body.written.join(', ');
};
img.src = '/${SOURCE}';
</script></body></html>`;

mkdirSync(OUT, { recursive: true });

createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/write') {
    let body = '';
    for await (const chunk of req) body += chunk;

    try {
      const files = JSON.parse(body);
      const written = [];
      for (const [name, base64] of Object.entries(files)) {
        writeFileSync(join(OUT, name), Buffer.from(base64, 'base64'));
        written.push(name);
      }
      console.log('wrote', written.join(', '));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ written }));
      console.log('done — stop this with ctrl-c');
    } catch (error) {
      console.error(error);
      res.writeHead(500).end(String(error));
    }
    return;
  }

  if (req.url === `/${SOURCE}`) {
    const { readFileSync } = await import('node:fs');
    res.writeHead(200, { 'Content-Type': 'image/webp' });
    res.end(readFileSync(join(ROOT, 'public', SOURCE)));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(PAGE);
}).listen(PORT, () => {
  console.log(`open http://localhost:${PORT} to generate the icons`);
});
