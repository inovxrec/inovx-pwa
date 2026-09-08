-- ==============================================================================
-- INOVX OPS — NOBODY PROMOTES THEMSELVES
-- Migration: 20260914000000_fix_self_promotion.sql
-- ==============================================================================
--
-- The hole
-- --------
-- `guard_user_self_update` (20260909000000) waved through any actor whose role
-- was 'admin' or 'super_admin', so that admins could edit other people's
-- profiles. But the self-update RLS policy also matches an admin editing their
-- OWN row — so the guard waved that through too:
--
--   signed in as the CTO (admin):
--     update users set role = 'super_admin' where id = auth.uid()  -> SUCCEEDED
--
-- Any of the five admins could hand themselves every super admin key —
-- permissions, members, integrations, archive, audit, task deletion — without
-- anyone granting it. Confirmed against the running database before this fix.
--
-- Two mistakes, both worth naming:
--   1. It tested a ROLE NAME where it should have tested a PERMISSION. Admins
--      do not hold `admin.members`; only super admins do, and that is exactly
--      the key that means "may change who someone is".
--   2. It never separated "editing someone else" from "editing yourself". The
--      whole point of the guard is the second case.
--
-- The rule now
-- ------------
--   · Changing your OWN role, status or tenure: nobody, ever. Not even a super
--     admin — a president who needs their own role changed asks the other one,
--     and that is a feature: it means no single account can quietly widen
--     itself, and the audit trail always names a second person.
--   · Changing SOMEONE ELSE's: needs `admin.members`, which is revocable in
--     §9.17 like any other key.
--   · Your own name, initials, avatar, phone, password flag: always yours.

CREATE OR REPLACE FUNCTION guard_user_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  identity_changed BOOLEAN;
BEGIN
  -- Not an end user: the provisioning script, the mirror trigger, a migration,
  -- the seed. These run without a JWT and are trusted by definition.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  identity_changed :=
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.tenure_id IS DISTINCT FROM OLD.tenure_id
    OR NEW.domain_id IS DISTINCT FROM OLD.domain_id
    OR NEW.domain IS DISTINCT FROM OLD.domain
    OR NEW.position_title IS DISTINCT FROM OLD.position_title;

  IF NOT identity_changed THEN
    RETURN NEW;
  END IF;

  -- Your own row: never, whoever you are.
  IF NEW.id = auth.uid() THEN
    RAISE EXCEPTION
      'You cannot change your own role, status, domain or position. Ask another admin.';
  END IF;

  -- Someone else's: the key that means it, not a role name that resembles it.
  IF NOT effective_permission('admin.members') THEN
    RAISE EXCEPTION
      'Changing a role, status, domain or position needs the Members permission.';
  END IF;

  RETURN NEW;
END;
$$;
