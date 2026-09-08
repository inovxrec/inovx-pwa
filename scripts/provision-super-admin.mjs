#!/usr/bin/env node
/*
  Issues an account on a real Supabase project.

  Creating an account needs the service role key, which bypasses row level
  security entirely and therefore must never reach the browser bundle. That is
  why this is a script you run from a terminal rather than a button on the
  Members screen, and why the key is read from the environment rather than from
  .env.local, which Vite would inline.

  Usage:

    SUPABASE_URL=https://<ref>.supabase.co \
    SUPABASE_SERVICE_ROLE_KEY=<service role key> \
    node scripts/provision-super-admin.mjs --email someone@example.edu.in --name "Their Name"

  Options:
    --email <address>     required
    --name  <full name>   required on a new account
    --role  <role>        member | admin | super_admin | faculty  (default super_admin)
    --domain <slug>       technical | management | events | media | design | core (default core)
    --position <title>    e.g. "Executive Lead"
    --password <secret>   default: one generated here and printed once
    --promote             the account already exists; only raise its role

  The generated password is printed once and stored nowhere. The account is
  marked as needing a password change, so it is only good for one sign-in and
  the app sends the person straight to /first-run (§9.2).
*/

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const ROLES = ['member', 'admin', 'super_admin', 'faculty'];
const DOMAINS = ['technical', 'management', 'events', 'media', 'design', 'core'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function die(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/*
  Base58-ish: no 0/O or l/1, because this password gets read off a screen and
  typed by hand, and a wrong character reads as "the account is broken".
*/
function generatePassword(length = 18) {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const args = parseArgs(process.argv.slice(2));

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  die(
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.\n' +
      '  Find the service role key under Project Settings → API. It is not the anon key,\n' +
      '  it bypasses row level security, and it must not be committed or put in .env.local.',
  );
}

const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
if (!email) die('Pass --email <address>.');

const role = typeof args.role === 'string' ? args.role : 'super_admin';
if (!ROLES.includes(role)) die(`--role must be one of: ${ROLES.join(', ')}`);

const domain = typeof args.domain === 'string' ? args.domain : 'core';
if (!DOMAINS.includes(domain)) die(`--domain must be one of: ${DOMAINS.join(', ')}`);

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** The account, if this address already has one. */
async function findByEmail(address) {
  // The admin API has no lookup-by-email, so this pages until it finds one.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const hit = data.users.find((user) => user.email?.toLowerCase() === address);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const { data: tenure, error: tenureError } = await supabase
    .from('tenures')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle();

  if (tenureError) die(`Could not read the active tenure: ${tenureError.message}`);
  if (!tenure) {
    die(
      'No active tenure. Push the migrations and run the seed before issuing accounts —\n' +
        '  a profile with no tenure is scoped to nothing and would see an empty club.',
    );
  }

  const existing = await findByEmail(email);

  if (existing && !args.promote && !args.password) {
    die(
      `${email} already has an account.\n` +
        '  Pass --promote to change its role, or --password to reset the password.',
    );
  }

  if (existing) {
    if (args.password && typeof args.password === 'string') {
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: args.password,
      });
      if (error) die(`Could not set the password: ${error.message}`);
    }

    const { error } = await supabase
      .from('users')
      .update({ role, must_change_password: Boolean(args.password) })
      .eq('id', existing.id);

    if (error) die(`Could not update the profile: ${error.message}`);

    console.log(`\n  ${email} is now ${role} on ${tenure.name}.\n`);
    return;
  }

  const name = typeof args.name === 'string' ? args.name.trim() : '';
  if (!name) die('Pass --name "Their Name" when creating an account.');

  const password = typeof args.password === 'string' ? args.password : generatePassword();

  /*
    The profile row is not written here. `handle_new_user` mirrors the account
    into public.users in the same transaction, reading the metadata below — so
    there is exactly one place that decides what a new profile looks like,
    whether the account came from this script, the dashboard, or an import.
  */
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role,
      domain,
      position_title: typeof args.position === 'string' ? args.position : null,
      must_change_password: true,
    },
  });

  if (error) die(`Could not create the account: ${error.message}`);

  // The mirror is a trigger, so a missing profile means the migration has not
  // been applied — worth saying now rather than at their first sign-in, where
  // it surfaces as "your account has no profile yet".
  const { data: profile } = await supabase
    .from('users')
    .select('id, role, tenure_id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile) {
    die(
      `The account was created but no profile appeared in public.users.\n` +
        '  Apply 20260909000000_auth_profile_mirror.sql, then re-run with --promote.',
    );
  }

  console.log(`
  Account issued on ${tenure.name}

    Email     ${email}
    Password  ${password}
    Role      ${role}

  This password is shown once and is stored nowhere. It is good for one sign-in:
  the app will require a new one before any screen opens.
`);
}

main().catch((caught) => die(caught instanceof Error ? caught.message : String(caught)));
