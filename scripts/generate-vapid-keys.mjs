#!/usr/bin/env node
/*
  Generates the VAPID key pair that identifies this app to the browsers' push
  services.

  This is the whole reason Web Push costs nothing. There is no account to make
  and no company in the middle: the key pair below is the identity, browsers
  accept pushes signed with it, and Google, Mozilla and Apple each run the
  delivery for free because it is a web standard rather than a product.

  Run once. The public key is safe in the bundle — it has to reach the browser
  to subscribe at all. The private key signs the sends and belongs only in
  Supabase's secrets:

    node scripts/generate-vapid-keys.mjs
    npx supabase secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_SUBJECT=mailto:...

  Regenerating them invalidates every existing subscription — everyone would
  have to allow notifications again — so do it once and keep them.
*/

import { generateKeyPairSync } from 'node:crypto';

/** base64url, which is what the Web Push spec uses everywhere. */
function b64url(buffer) {
  return Buffer.from(buffer).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// VAPID is ECDSA on P-256 (prime256v1). Nothing exotic; node does it directly.
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

/*
  Read out as JWK rather than by slicing DER at fixed offsets. The JWK names its
  parts — d is the private scalar, x and y the public point — so this cannot
  silently drift if an encoding detail changes, and each part is already
  base64url, which is exactly what the push spec wants.
*/
const jwk = privateKey.export({ format: 'jwk' });
const pub = publicKey.export({ format: 'jwk' });

const fromB64url = (value) => Buffer.from(value, 'base64url');

// The public key travels as the uncompressed point: 0x04 || x || y.
const rawPublic = Buffer.concat([
  Buffer.from([0x04]),
  fromB64url(pub.x),
  fromB64url(pub.y),
]);
const rawPrivate = fromB64url(jwk.d);

if (rawPublic.length !== 65 || rawPrivate.length !== 32) {
  throw new Error(`unexpected key sizes: public ${rawPublic.length}, private ${rawPrivate.length}`);
}

console.log(`
  VAPID keys — generated once, then kept.

  Public  (safe in the bundle, goes in .env.local as VITE_VAPID_PUBLIC_KEY)

    ${b64url(rawPublic)}

  Private (secret — Supabase only, never in the bundle or in git)

    ${b64url(rawPrivate)}

  Next:

    npx supabase secrets set \\
      VAPID_PUBLIC_KEY=${b64url(rawPublic)} \\
      VAPID_PRIVATE_KEY=${b64url(rawPrivate)} \\
      VAPID_SUBJECT=mailto:adishwarseelan.sk.2024.csbs@rajalakshmi.edu.in
`);
