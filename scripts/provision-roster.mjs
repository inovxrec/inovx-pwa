#!/usr/bin/env node
/*
  Issues an account for everyone on the club's roster, in one pass.

  Why not one shared password
  ---------------------------
  The club's addresses are formulaic — firstname.x.2025.dept@rajalakshmi.edu.in
  — so a shared starting password means anyone who finds the URL can derive all
  39 addresses and sign in as any of them, including the two super admins, and
  each account stays open until that person personally logs in and changes it.
  On a laptop bound to 127.0.0.1 that does not matter. On a public project it is
  the whole attack.

  So everyone gets their own, generated here, shown once, and unusable after
  their first sign-in because `must_change_password` sends them to /first-run.

  Usage:

    SUPABASE_URL=https://<ref>.supabase.co \
    SUPABASE_SERVICE_ROLE_KEY=<service role key> \
    node scripts/provision-roster.mjs [--dry-run] [--out passwords.csv]

  The service role key bypasses row level security completely: it belongs in the
  environment for the length of this one command, never in .env.local, which
  Vite compiles into the bundle.
*/

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outAt = args.indexOf('--out');
const outFile = outAt !== -1 ? args[outAt + 1] : 'roster-passwords.csv';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`
  Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
  Find the service role key under Project Settings -> API. It is not the anon
  key, it bypasses row level security, and it must not be committed.
`);
  process.exit(1);
}

/*
  No 0/O or l/1: these get read off a screen and typed by hand, and a wrong
  character reads as "the account is broken" rather than as a typo.
*/
function generatePassword(length = 14) {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Everyone already listed in the directory, which is the club's own roster. */
const { data: tenure, error: tenureError } = await supabase
  .from('tenures')
  .select('id, name')
  .eq('is_active', true)
  .maybeSingle();

if (tenureError || !tenure) {
  console.error('\n  No active tenure. Run supabase/seed_club_only.sql first.\n');
  process.exit(1);
}

const { data: directory, error: dirError } = await supabase
  .from('member_directory')
  .select('id, name, email, domain_name, role_label, linked_user_id')
  .eq('tenure_id', tenure.id)
  .order('name');

if (dirError || !directory?.length) {
  console.error('\n  The directory is empty. Run supabase/seed_club_only.sql first.\n');
  process.exit(1);
}

/*
  Who is a super admin, and who is an admin, is a fact about the club rather
  than something to re-derive: it is read from the position the directory
  already records, which came from the member sheet.
*/
const SUPER_ADMIN_TITLES = ['President', 'Vice President'];
const ADMIN_TITLES = [
  'Chief Operating Officer',
  'Chief Technical Officer',
  'Treasurer',
  'Secretary',
];

const DOMAIN_BY_NAME = {
  'Technical': 'technical',
  'Management': 'management',
  'Events': 'events',
  'Media & PR': 'media',
  'Design': 'design',
  'Core Ops': 'core',
};

function roleFor(title) {
  if (SUPER_ADMIN_TITLES.includes(title)) return 'super_admin';
  if (ADMIN_TITLES.includes(title)) return 'admin';
  return 'member';
}

// The admin API has no lookup-by-email, so the existing accounts are read once.
const existing = new Map();
for (let page = 1; page <= 20; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) break;
  for (const user of data.users) {
    if (user.email) existing.set(user.email.toLowerCase(), user.id);
  }
  if (data.users.length < 200) break;
}

console.log(`\n  ${tenure.name} — ${directory.length} people in the directory, ` +
  `${existing.size} accounts already exist.\n`);

const issued = [];
const skipped = [];
const failed = [];

for (const person of directory) {
  const email = person.email?.trim().toLowerCase();
  if (!email) {
    failed.push([person.name, 'no email in the directory']);
    continue;
  }

  if (existing.has(email)) {
    skipped.push(person.name);
    // Still worth linking: an account made earlier may not be joined up.
    if (!person.linked_user_id && !dryRun) {
      await supabase
        .from('member_directory')
        .update({ linked_user_id: existing.get(email) })
        .eq('id', person.id);
    }
    continue;
  }

  const password = generatePassword();
  const role = roleFor(person.role_label);

  if (dryRun) {
    issued.push({ name: person.name, email, role, password: '(dry run)' });
    continue;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: person.name,
      role,
      domain: DOMAIN_BY_NAME[person.domain_name] ?? 'core',
      position_title: person.role_label,
      must_change_password: true,
    },
  });

  if (error || !data?.user) {
    failed.push([person.name, error?.message ?? 'unknown error']);
    continue;
  }

  /*
    Join the account to the directory row it came from. The mirror trigger built
    the profile, but nothing else knows these two rows are the same person, and
    the People screen reads the directory.
  */
  await supabase
    .from('member_directory')
    .update({ linked_user_id: data.user.id })
    .eq('id', person.id);

  issued.push({ name: person.name, email, role, password });
}

/* ------------------------------------------------------------------ report */

if (issued.length > 0 && !dryRun) {
  const csv = [
    'name,email,role,password',
    ...issued.map((r) => `"${r.name}",${r.email},${r.role},${r.password}`),
  ].join('\n');
  writeFileSync(outFile, csv + '\n', 'utf8');
}

console.log(`  issued   ${issued.length}`);
console.log(`  skipped  ${skipped.length}  (already had an account)`);
console.log(`  failed   ${failed.length}`);
for (const [name, why] of failed) console.log(`     ${name}: ${why}`);

if (issued.length > 0 && !dryRun) {
  console.log(`
  Passwords written to ${outFile}

  Hand each person their own line, then delete the file. Every one of these is
  good for a single sign-in: the app requires a new password before any screen
  opens. None of them is in git, and nothing here can print them again.
`);
} else if (dryRun) {
  console.log('\n  Dry run — nothing was created.\n');
}
