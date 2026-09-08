-- ==============================================================================
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
      'adishwarseelan.sk.2024.csbs@rajalakshmi.edu.in',
      'lalitha.b.2024.csbs@rajalakshmi.edu.in',
      'subeesh.s.2024.bt@rajalakshmi.edu.in',
      'jaiharish.d.2024.cse@rajalakshmi.edu.in',
      'subash.r.2024.cse@rajalakshmi.edu.in',
      'tharika.r.2024.csbs@rajalakshmi.edu.in',
      'athithya.r.2024.csbs@rajalakshmi.edu.in',
      'chandanashankari.2025.it@rajalakshmi.edu.in',
      'pavanprasad.p.2025.it@rajalakshmi.edu.in',
      'sanjanabanerjee.2025.cse@rajalakshmi.edu.in',
      'katelynsanjanakhanna.2025.csd@rajalakshmi.edu.in',
      'devanand.c.2025.eee@rajalakshmi.edu.in',
      'saranya.b.2025.csbs@rajalakshmi.edu.in',
      'gayathri.s1.2025.cse@rajalakshmi.edu.in',
      'abirami.g.2025.it@rajalakshmi.edu.in',
      'assvine.s.2025.csbs@rajalakshmi.edu.in',
      'praveensundar.r.2025.eee@rajalakshmi.edu.in',
      'mohamedirfan.s.2025.csecs@rajalakshmi.edu.in',
      'vijayalakshmiradhakrishnan.2025.csbs@rajalakshmi.edu.in',
      'chithra.sp.2025.it@rajalakshmi.edu.in',
      'asrafathima.s.2025.csbs@rajalakshmi.edu.in',
      'ragamithra.kb.2025.csbs@rajalakshmi.edu.in',
      'lingeesh.l.2025.ft@rajalakshmi.edu.in',
      'kolakaletijeetheshsriphani.2025.csd@rajalakshmi.edu.in',
      'poshitha.s.2025.cse@rajalakshmi.edu.in',
      'sandhiya.p.2025.csbs@rajalakshmi.edu.in',
      'visal.g.2025.mech@rajalakshmi.edu.in',
      'pooja.r.2025.csbs@rajalakshmi.edu.in',
      'sreevishal.ks.2025.it@rajalakshmi.edu.in',
      'mayanksharma.2025.aiml@rajalakshmi.edu.in',
      'visshwajit.pr.2025.mech@rajalakshmi.edu.in',
      'akash.d.2025.csbs@rajalakshmi.edu.in',
      'harini.s.2025.cse@rajalakshmi.edu.in',
      'jaswanthgunasekaran.2025.cse@rajalakshmi.edu.in',
      'sanjeevkumar.k.2025.mct@rajalakshmi.edu.in',
      'harini.m1.2025.cse@rajalakshmi.edu.in',
      'laxmigayathiri.s.2025.aids@rajalakshmi.edu.in',
      'bhuvaneswaran.s.2025.cse@rajalakshmi.edu.in',
      'varun.ms.2025.cse@rajalakshmi.edu.in'
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
