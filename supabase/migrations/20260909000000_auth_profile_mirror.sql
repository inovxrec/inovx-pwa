-- ==============================================================================
-- INOVX OPS — AUTH → PROFILE MIRROR
-- Migration: 20260909000000_auth_profile_mirror.sql
-- Description: Every account in auth.users gets a row in public.users.
-- ==============================================================================
--
-- Why this exists
-- ---------------
-- `AuthProvider` signs a person in against auth.users and then reads their
-- profile out of public.users for the role, domain and position. If the profile
-- is missing it signs them straight back out — a session with no role would be
-- handed a member's screens by default, which is a guess about access.
--
-- Nothing created that profile row. An account made in the Supabase dashboard,
-- by the provisioning script, or by a future worker draining `pending_imports`
-- would authenticate and then dead-end. This trigger closes that gap: the
-- profile is created in the same transaction as the account, so the two cannot
-- drift apart.

-- ------------------------------------------------------------------------------
-- 1. The mirror
-- ------------------------------------------------------------------------------
-- Reads name, role, domain and position out of the account's user metadata,
-- which is what `auth.admin.createUser({ user_metadata })` writes. Everything
-- has a defensible default, so an account created by hand in the dashboard with
-- no metadata at all still lands as an active member rather than failing.
--
-- SECURITY DEFINER because the trigger runs as the auth service, which has no
-- rights on public.users. `search_path` is pinned for the usual reason: a
-- definer function that resolves names through the caller's path is a way in.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name TEXT;
  v_role TEXT;
  v_domain TEXT;
  v_tenure UUID;
  v_domain_id UUID;
BEGIN
  -- A name is required by the schema and often absent from metadata. The local
  -- part of the address is a poor name but an honest one, and it is visible
  -- enough that whoever set the account up will fix it.
  v_name := NULLIF(TRIM(COALESCE(meta ->> 'name', '')), '');
  IF v_name IS NULL THEN
    v_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;

  -- An unrecognised role becomes a member. Anything else would mean a typo in
  -- metadata could mint an admin.
  v_role := LOWER(COALESCE(meta ->> 'role', 'member'));
  IF v_role NOT IN ('member', 'admin', 'super_admin', 'faculty') THEN
    v_role := 'member';
  END IF;

  v_domain := NULLIF(LOWER(TRIM(COALESCE(meta ->> 'domain', ''))), '');

  SELECT id INTO v_tenure FROM tenures WHERE is_active LIMIT 1;

  IF v_tenure IS NOT NULL AND v_domain IS NOT NULL THEN
    SELECT id INTO v_domain_id
    FROM domains
    WHERE tenure_id = v_tenure AND slug = v_domain;
  END IF;

  INSERT INTO users (
    id, tenure_id, email, name, role, domain_id, domain, position_title,
    status, must_change_password
  )
  VALUES (
    NEW.id,
    v_tenure,
    NEW.email,
    v_name,
    v_role,
    v_domain_id,
    v_domain,
    NULLIF(TRIM(COALESCE(meta ->> 'position_title', '')), ''),
    'active',
    -- The account was issued by someone else unless it says otherwise, so the
    -- password it was issued with has to be changed on first sign-in (§9.2).
    COALESCE((meta ->> 'must_change_password')::boolean, TRUE)
  )
  -- A profile seeded ahead of the account keeps whatever the seed said; this
  -- trigger is here to stop a missing row, not to overwrite a deliberate one.
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Keep the address in step
-- ------------------------------------------------------------------------------
-- Changing an email in auth without changing it in public.users would leave the
-- profile answering to an address that can no longer sign in.
CREATE OR REPLACE FUNCTION handle_user_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE users SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_user_email_changed
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION handle_user_email_change();

-- ------------------------------------------------------------------------------
-- 3. Let a person read and finish their own profile
-- ------------------------------------------------------------------------------
-- The foundation migration's placeholder lets any authenticated user SELECT
-- from public.users, but nothing may write to it — including the person whose
-- row it is. `AuthProvider.setPassword` clears `must_change_password` there, so
-- without this /first-run would appear again on every sign-in.
--
-- The policy alone would be a privilege escalation: `role` lives on this table,
-- so "you may update your own row" reads as "you may make yourself a super
-- admin". RLS has no column granularity, so the guard below draws that line —
-- the policy says which rows may be touched, the trigger says which fields.
--
-- A column GRANT would also express it, but grants are per-database-role and
-- every signed-in person is `authenticated`; it would lock admins out of the
-- same columns. The check has to know who is asking, so it is a trigger.
CREATE POLICY "self_users_finish_setup" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION guard_user_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role TEXT;
BEGIN
  -- Not an end user: the provisioning script, the mirror trigger, a migration.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO actor_role FROM users WHERE id = auth.uid();

  IF actor_role IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.tenure_id IS DISTINCT FROM OLD.tenure_id
     OR NEW.domain_id IS DISTINCT FROM OLD.domain_id
     OR NEW.domain IS DISTINCT FROM OLD.domain
     OR NEW.position_title IS DISTINCT FROM OLD.position_title
  THEN
    RAISE EXCEPTION 'Only an admin may change a role, status, domain or position';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_guard_self_update
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION guard_user_self_update();
