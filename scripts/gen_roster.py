# Regenerates the roster blocks in supabase/seed.sql and supabase/seed_local_auth.sql
# from the club's member sheet. Run from the project root.
import io, re

TENURE = '11111111-1111-1111-1111-111111111111'
DOM = {
    'technical':  '22222222-2222-2222-2222-000000000001',
    'management': '22222222-2222-2222-2222-000000000002',
    'events':     '22222222-2222-2222-2222-000000000003',
    'media':      '22222222-2222-2222-2222-000000000004',
    'design':     '22222222-2222-2222-2222-000000000005',
    'core':       '22222222-2222-2222-2222-000000000006',
}

def uid(n):  return '33333333-3333-3333-3333-%012d' % n
def did(n):  return '77777777-7777-7777-7777-%012d' % n

# (slot, name, dept, email-local, domain, role, position, is_domain_lead)
# Slots 1-8 reuse the ids the rest of the seed already references, so the
# sample tasks, committees and activity stay pointed at real people.
R = [
 (1,'Adishwar Seelan S K','CSBS','adishwarseelan.sk.2024.csbs','core','super_admin','President',False),
 (8,'Lalitha B','CSBS','lalitha.b.2024.csbs','core','super_admin','Vice President',False),
 (3,'Subeesh Sekar','BT','subeesh.s.2024.bt','core','admin','Chief Operating Officer',False),
 (9,'Jaiharish D','CSE','jaiharish.d.2024.cse','core','admin','Chief Operating Officer',False),
 (2,'Subash R','CSE','subash.r.2024.cse','core','admin','Chief Technical Officer',False),
 (10,'Tharika R','CSBS','tharika.r.2024.csbs','core','admin','Treasurer',False),
 (11,'Athithya R','CSBS','athithya.r.2024.csbs','core','admin','Secretary',False),

 (5,'Chandana Shankari','IT','chandanashankari.2025.it','events','member','Event Team Lead',True),
 (12,'Pavan Prasad P','IT','pavanprasad.p.2025.it','events','member','Member',False),
 (13,'Sanjana Banerjee','CSE','sanjanabanerjee.2025.cse','events','member','Member',False),
 (14,'Katelyn Sanjana Khanna','CSD','katelynsanjanakhanna.2025.csd','events','member','Member',False),
 (15,'Devanand C','EEE','devanand.c.2025.eee','events','member','Member',False),
 (16,'Saranya B','CSBS','saranya.b.2025.csbs','events','member','Member',False),
 (17,'Gayathri S','CSE','gayathri.s1.2025.cse','events','member','Member',False),
 (18,'Abirami G','IT','abirami.g.2025.it','events','member','Member',False),

 (19,'Ashwini S','CSBS','assvine.s.2025.csbs','management','member','Management Team Lead',True),
 (20,'Praveen Sundar R','EEE','praveensundar.r.2025.eee','management','member','Member',False),
 (21,'Mohamed Irfan S','CSECS','mohamedirfan.s.2025.csecs','management','member','Member',False),
 (22,'Vijayalakshmi Radhakrishnan','CSBS','vijayalakshmiradhakrishnan.2025.csbs','management','member','Member',False),
 (23,'Chithra S P','IT','chithra.sp.2025.it','management','member','Member',False),
 (24,'Asra Fathima S','CSBS','asrafathima.s.2025.csbs','management','member','Member',False),

 (25,'Ragamithra K B','CSBS','ragamithra.kb.2025.csbs','media','member','Media Team Lead',True),
 (26,'Lingeesh L','FT','lingeesh.l.2025.ft','media','member','Member',False),
 (27,'Kolakaleti Jeethesh Sri Phani','CSD','kolakaletijeetheshsriphani.2025.csd','media','member','Member',False),
 (28,'Poshitha S','CSE','poshitha.s.2025.cse','media','member','Member',False),

 (4,'Sandhiya P','CSBS','sandhiya.p.2025.csbs','design','member','Design Team Lead',True),
 (29,'Visal G','MECH','visal.g.2025.mech','design','member','Member',False),
 (7,'Pooja R','CSBS','pooja.r.2025.csbs','design','member','Member',False),
 (30,'Sree Vishal K S','IT','sreevishal.ks.2025.it','design','member','Member',False),

 (6,'Mayank Sharma','AIML','mayanksharma.2025.aiml','technical','member','Member',False),
 (31,'P R Visshwajit','MECH','visshwajit.pr.2025.mech','technical','member','Member',False),
 (32,'Akash D','CSBS','akash.d.2025.csbs','technical','member','Member',False),
 (33,'Harini S','CSE','harini.s.2025.cse','technical','member','Member',False),
 (34,'Jaswanth Gunasekaran','CSE','jaswanthgunasekaran.2025.cse','technical','member','Member',False),
 (35,'K Sanjeev Kumar','MCT','sanjeevkumar.k.2025.mct','technical','member','Member',False),
 (36,'Harini M','CSE','harini.m1.2025.cse','technical','member','Member',False),
 (37,'Laxmi Gayathiri S','AIDS','laxmigayathiri.s.2025.aids','technical','member','Member',False),
 (38,'Bhuvaneswaran S','CSE','bhuvaneswaran.s.2025.cse','technical','member','Member',False),
 (39,'M S Varun','CSE','varun.ms.2025.cse','technical','member','Member',False),
]

DOMAIN_NAME = {'technical':'Technical','management':'Management','events':'Events',
               'media':'Media & PR','design':'Design','core':'Core Ops'}

def initials(name):
    # The first two parts, not first-and-last: half this roster writes its
    # initials at the END of the name ("Adishwar Seelan S K"), so first-and-last
    # would render that as AK rather than AS.
    parts = [p for p in name.split() if p]
    return (parts[0][0] + (parts[1][0] if len(parts) > 1 else '')).upper()

def email(local):
    return local + '@rajalakshmi.edu.in'

def q(s):
    return "'" + s.replace("'", "''") + "'"

# ---------------------------------------------------------------- users block
lines = []
for slot, name, dept, local, domain, role, position, lead in R:
    lines.append(
        "  (%s, '%s', %s, %s, %s, %s, '%s', %s, %s, 'active', TRUE)"
        % (q(uid(slot)), TENURE, q(email(local)), q(name), q(initials(name)),
           q(role), DOM[domain], q(domain), q(position))
    )

users_block = """-- 3. Users — the club's actual roster (see the member sheet).
-- Everyone is issued the same first password and must change it (§9.2); the
-- accounts themselves are created in seed_local_auth.sql, which reuses these ids.
-- Only the President and Vice President are super admins. The rest of the core
-- team are admins. Domain leads hold no admin key — they run a board.
INSERT INTO users (id, tenure_id, email, name, initials, role, domain_id, domain, position_title, status, must_change_password)
VALUES
%s
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  initials = EXCLUDED.initials,
  role = EXCLUDED.role,
  domain_id = EXCLUDED.domain_id,
  domain = EXCLUDED.domain,
  position_title = EXCLUDED.position_title;

-- Domain leads. Technical is led by the CTO, who is also the tech team lead.
""" % (',\n'.join(lines))

leads = {d: None for d in DOM}
for slot, name, dept, local, domain, role, position, lead in R:
    if lead:
        leads[domain] = slot
leads['technical'] = 2   # Subash R, CTO and tech team lead
leads['core'] = 1        # Adishwar, President

for slug in ['technical', 'management', 'events', 'media', 'design', 'core']:
    users_block += "UPDATE domains SET lead_user_id = '%s' WHERE slug = '%s';\n" % (uid(leads[slug]), slug)

# ------------------------------------------------------------ directory block
dir_lines = []
for i, (slot, name, dept, local, domain, role, position, lead) in enumerate(R, start=1):
    dir_lines.append(
        "  (%s, '%s', %s, %s, '%s', %s, %s, %s, '%s')"
        % (q(did(i)), TENURE, q(name), q(email(local)), DOM[domain],
           q(DOMAIN_NAME[domain]), q(position), q(uid(slot)),
           '{"department": "%s"}' % dept)
    )

directory_block = """-- 9. Member Directory — the same roster, as the club's own list.
-- ClubProvider prefers this over the accounts table, so the two are seeded from
-- one source and cannot disagree. Birthdays are left NULL because nobody has
-- collected them; the occasion engine raises birthday work only once they are in.
INSERT INTO member_directory (id, tenure_id, name, email, domain_id, domain_name, role_label, linked_user_id, metadata)
VALUES
%s
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  domain_id = EXCLUDED.domain_id,
  domain_name = EXCLUDED.domain_name,
  role_label = EXCLUDED.role_label,
  linked_user_id = EXCLUDED.linked_user_id,
  metadata = EXCLUDED.metadata;
""" % (',\n'.join(dir_lines))

# ------------------------------------------------------------- patch seed.sql
p = 'supabase/seed.sql'
s = io.open(p, encoding='utf-8').read()

start = s.index('-- 3. Users')
end = s.index('-- 4. Committees')
s = s[:start] + users_block + '\n' + s[end:]

start = s.index('-- 9. Member Directory')
end = s.index('-- 10. Feature Flags')
s = s[:start] + directory_block + '\n' + s[end:]

io.open(p, 'w', encoding='utf-8').write(s)

# ------------------------------------------------- rewrite seed_local_auth.sql
emails = ',\n      '.join(q(email(local)) for _, _, _, local, _, _, _, _ in R)

auth_sql = """-- ==============================================================================
-- INOVX OPS — LOCAL SIGN-IN ACCOUNTS
-- supabase/seed_local_auth.sql
-- ==============================================================================
--
-- An account in auth.users for everyone on the roster, so a local stack comes
-- up signable-into. Registered in config.toml after seed.sql, because the
-- profiles in public.users have to exist first — these rows reuse their ids, so
-- the mirror trigger has nothing left to do and the two tables cannot disagree
-- about who someone is.
--
-- Everyone's first password is `demo`, and every profile is marked
-- must_change_password, so the first sign-in goes to /first-run and cannot get
-- past it without setting a real one (§9.2). `demo` is four characters and would
-- fail every rule on that screen — which is the point: it is a door key, not a
-- password, and it only opens the screen that replaces it.
--
-- LOCAL ONLY. There is no reliable way for SQL to tell a local stack from a
-- hosted one — both are a database called `postgres` with the same Supabase
-- roles — so this file does not try to guess. What keeps it local is that only
-- `supabase db reset` runs it. NEVER run `supabase db push --include-seed`
-- against staging or production: it would create every one of these accounts
-- there, with a password that is written down in a public repository. Real
-- accounts are issued by `scripts/provision-super-admin.mjs`, which generates a
-- password nobody has read.

DO $$
DECLARE
  account RECORD;
  -- bcrypt, computed once rather than per row.
  hashed TEXT := crypt('demo', gen_salt('bf'));
BEGIN
  FOR account IN
    SELECT id, email, role
    FROM public.users
    WHERE email IN (
      %s
    )
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      account.id,
      'authenticated',
      'authenticated',
      account.email,
      hashed,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role', account.role),
      NOW(), NOW(),
      '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = EXCLUDED.email_confirmed_at;

    -- GoTrue will not sign anyone in without a matching identity row; the
    -- account alone is not enough.
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      account.id,
      account.id::text,
      'email',
      jsonb_build_object('sub', account.id::text, 'email', account.email,
                         'email_verified', true, 'phone_verified', false),
      NOW(), NOW(), NOW()
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  END LOOP;
END;
$$;
""" % emails

io.open('supabase/seed_local_auth.sql', 'w', encoding='utf-8').write(auth_sql)

print('users: %d' % len(R))
print('super_admin: %d, admin: %d, member: %d' % (
    sum(1 for r in R if r[5] == 'super_admin'),
    sum(1 for r in R if r[5] == 'admin'),
    sum(1 for r in R if r[5] == 'member')))
print('slots unique: %s' % (len(set(r[0] for r in R)) == len(R)))
print('emails unique: %s' % (len(set(r[3] for r in R)) == len(R)))
