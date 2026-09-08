// ==============================================================================
// INOVX OPS — WEB PUSH, WITHOUT A LIBRARY
// supabase/functions/send-push/webpush.ts
// ==============================================================================
//
// `npm:web-push` is a Node package, and running it through Deno's compatibility
// layer blew the edge runtime's CPU budget before it could send anything:
//
//   CPU time soft limit reached: isolate: 4a6506be-...
//   user worker failed to respond: the worker has already retired
//
// So the two specs it implements are done here directly on Web Crypto, which
// Deno runs natively. It is more code but a fraction of the work at runtime,
// and it removes a dependency from the one path that has to be reliable.
//
//   RFC 8291 — payload encryption (aes128gcm)
//   RFC 8292 — VAPID, which is how the push service knows it is us
//
// Neither spec is negotiable in its details: a wrong byte anywhere and the push
// service answers 400 with no explanation, so each step below says what it is.

const encoder = new TextEncoder();

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** An uncompressed P-256 point (0x04 || x || y) as a JWK Web Crypto accepts. */
function pointToJwk(point: Uint8Array): JsonWebKey {
  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(point.subarray(1, 33)),
    y: bytesToB64url(point.subarray(33, 65)),
    ext: true,
  };
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/**
 * The VAPID Authorization header.
 *
 * A JWT signed with our own key, whose audience is the push service's origin.
 * This is the whole of what makes Web Push free: no account anywhere, just a
 * key pair we generated and a signature the browser vendors agree to trust.
 */
async function vapidHeader(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string,
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = {
    aud: audience,
    // Twelve hours. The spec caps it at 24; shorter limits the blast radius of
    // a leaked token without needing a refresh on every send.
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const unsigned =
    `${bytesToB64url(encoder.encode(JSON.stringify(header)))}.` +
    `${bytesToB64url(encoder.encode(JSON.stringify(claims)))}`;

  const pub = b64urlToBytes(publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    { ...pointToJwk(pub), d: privateKey },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // Web Crypto emits the raw r||s pair, which is exactly what JWS wants — no
  // DER unwrapping, unlike most Node examples of this.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsigned),
  );

  return `vapid t=${unsigned}.${bytesToB64url(new Uint8Array(signature))}, k=${publicKey}`;
}

/**
 * Encrypts the payload so only this subscriber's browser can read it.
 *
 * The push service forwards an opaque blob: it never sees the message. The keys
 * come from the subscription the browser handed us, and the shared secret is
 * agreed with an ephemeral key pair made fresh for this one message.
 */
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string,
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(p256dh);
  const authSecret = b64urlToBytes(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeral.publicKey),
  );

  const uaKey = await crypto.subtle.importKey(
    'jwk',
    pointToJwk(uaPublic),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256),
  );

  // RFC 8291 §3.3 — the key derivation, byte for byte.
  const keyInfo = concat(
    encoder.encode('WebPush: info\0'),
    uaPublic,
    asPublic,
  );
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 marks the last record. There is only ever one here.
  const plaintext = concat(encoder.encode(payload), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext),
  );

  // The aes128gcm header: salt | record size | key id length | key id.
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushResult {
  ok: boolean;
  status: number;
  /** True when the subscription is gone for good and should be dropped. */
  gone: boolean;
  body?: string;
}

export async function sendPush(
  subscription: PushSubscription,
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string },
  ttlSeconds = 60 * 60 * 24,
): Promise<PushResult> {
  const body = await encryptPayload(payload, subscription.p256dh, subscription.auth);
  const authorization = await vapidHeader(
    subscription.endpoint,
    vapid.publicKey,
    vapid.privateKey,
    vapid.subject,
  );

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
    },
    body,
  });

  return {
    ok: response.ok,
    status: response.status,
    // 404 and 410 mean the browser is gone; anything else may be transient.
    gone: response.status === 404 || response.status === 410,
    body: response.ok ? undefined : await response.text().catch(() => undefined),
  };
}
