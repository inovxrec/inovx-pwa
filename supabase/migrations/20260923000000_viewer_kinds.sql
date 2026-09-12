-- ==============================================================================
-- INOVX OPS — FACULTY COORDINATORS AND THE SUPPORT COMMITTEE
-- Migration: 20260923000000_viewer_kinds.sql
-- ==============================================================================
--
-- Two kinds of people watch the club without running it: the faculty who
-- coordinate it on the college's side, and the support committee — last
-- tenure's office-holders, who are not on this year's committee at all and are
-- kept around for what they remember. Both read everything and write nothing.
--
-- Why this is a label and not a role
-- ----------------------------------
-- `role = 'faculty'` already means exactly "reads everything, writes nothing",
-- and it means it in twenty-odd policies across
-- `20260910000000_real_rls_policies.sql` — every write policy excludes
-- `is_faculty()` by name, `role_default_permissions` gives it the read keys and
-- nothing else, and `LANDING_BY_ROLE` already sends it to /oversight.
--
-- A second role with identical behaviour would mean editing every one of those
-- policies to say "or this one too", and the first policy anybody forgot would
-- be a support-committee member with a write they should not have. The two
-- groups differ in what they are called, not in what they may do, so what
-- differs is a column.
--
-- If they ever do diverge — a faculty coordinator who may approve, say — that
-- is the day to split the role, and this column is what tells you who to move.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS viewer_kind TEXT
    CHECK (viewer_kind IS NULL OR viewer_kind IN ('faculty_coordinator', 'support_committee'));

COMMENT ON COLUMN users.viewer_kind IS
  'Which kind of read-only watcher this is. Meaningful only when role = ''faculty''; NULL for everyone else.';

-- A label on a role nobody else holds. Enforced rather than left to the invite
-- function, because the invite function is one caller and this is a rule about
-- the data: a member with a viewer_kind would show up in the directory as a
-- faculty coordinator who can still move cards.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_viewer_kind_is_faculty;

ALTER TABLE users
  ADD CONSTRAINT chk_viewer_kind_is_faculty
  CHECK (viewer_kind IS NULL OR role = 'faculty');

-- ------------------------------------------------------------------------------
-- The account carries the label in with it
-- ------------------------------------------------------------------------------
-- `handle_new_user` (20260909000000) builds the profile out of the account's
-- metadata in the same transaction as the account itself, which is the whole
-- reason a person cannot end up authenticated with no role. A viewer invited
-- with `viewer_kind` in their metadata has to arrive the same way: the
-- alternative is the invite function creating the account and then updating the
-- profile in a second call, which can fail on its own and leave a faculty
-- member with no label and no way to tell which kind they are.
--
-- Unchanged from the original apart from reading and writing that one field,
-- and refusing to set it for a role that may not hold it.
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
  v_viewer_kind TEXT;
BEGIN
  v_name := NULLIF(TRIM(COALESCE(meta ->> 'name', '')), '');
  IF v_name IS NULL THEN
    v_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;

  v_role := LOWER(COALESCE(meta ->> 'role', 'member'));
  IF v_role NOT IN ('member', 'admin', 'super_admin', 'faculty') THEN
    v_role := 'member';
  END IF;

  -- Same reasoning as the role above: an unrecognised label becomes no label
  -- rather than being trusted, and a label on a non-faculty account is dropped
  -- rather than failing the insert — the account is still valid without it.
  v_viewer_kind := LOWER(NULLIF(TRIM(COALESCE(meta ->> 'viewer_kind', '')), ''));
  IF v_role <> 'faculty'
     OR v_viewer_kind NOT IN ('faculty_coordinator', 'support_committee') THEN
    v_viewer_kind := NULL;
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
    status, must_change_password, viewer_kind
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
    COALESCE((meta ->> 'must_change_password')::boolean, TRUE),
    v_viewer_kind
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- Nobody relabels themselves either
-- ------------------------------------------------------------------------------
-- `guard_user_self_update` (20260914000000) lists the fields that say who a
-- person is and refuses to let anyone change their own. `viewer_kind` is one of
-- them — without this line a support-committee member could rewrite themselves
-- as a faculty coordinator, which is a claim about the college rather than a
-- preference. Everything else about the function is unchanged.
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
    OR NEW.position_title IS DISTINCT FROM OLD.position_title
    OR NEW.viewer_kind IS DISTINCT FROM OLD.viewer_kind;

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
