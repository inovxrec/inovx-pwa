-- ==============================================================================
-- INOVX OPS — OCCASION ENGINE & INTEGRATIONS
-- Migration: 20260908000000_occasions_and_integrations.sql
-- Description: The two tables §9.15 needs that the foundation schema left out —
--              the occasion engine's rules and the sync health of what INOVX
--              talks to. Follows the foundation file's conventions: tenure
--              scoping, an updated_at trigger, RLS on with a placeholder policy
--              Stream B replaces.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Occasions Table
-- ------------------------------------------------------------------------------
-- One row per date that generates work on its own: a birthday, the club's
-- foundation day, a festival. The output configuration (§9.15's sub-panel) lives
-- on the same row because there is exactly one per occasion — a separate table
-- would be a join with nothing on the other side of it.
--
-- `occasion_date` is MM-DD, not a DATE: these repeat every year, and storing a
-- year would make each row a claim about one year only. Lunar occasions have no
-- MM-DD at all until someone confirms this year's, which is what
-- `confirmed_date` and `confirmed_year` hold.
CREATE TABLE IF NOT EXISTS occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- e.g. 'Diwali', 'Riya — birthday'
  occasion_type TEXT NOT NULL
    CHECK (occasion_type IN ('birthday', 'festival', 'anniversary', 'lunar')),
  occasion_date TEXT
    CHECK (occasion_date IS NULL OR occasion_date ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  confirmed_date DATE,                     -- This year's date, once confirmed
  confirmed_year INTEGER,                  -- The year confirmed_date belongs to
  output_domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  lead_days INTEGER NOT NULL DEFAULT 5 CHECK (lead_days BETWEEN 0 AND 60),
  assignment_strategy TEXT NOT NULL DEFAULT 'domain-lead'
    CHECK (assignment_strategy IN ('domain-lead', 'round-robin', 'unassigned')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Set for a person's birthday so the row can be traced back to them.
  directory_member_id UUID REFERENCES member_directory(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_occasions_updated_at
BEFORE UPDATE ON occasions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Integrations Table
-- ------------------------------------------------------------------------------
-- What INOVX syncs with, and whether it is working. `status` is recorded rather
-- than inferred from last_synced_at: a sync can run on time and still be wrong,
-- and a green bar with no measurement behind it would be worse than no bar.
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                       -- e.g. 'google-drive', 'college-erp'
  name TEXT NOT NULL,                      -- e.g. 'Google Drive'
  status TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok', 'degraded', 'failing', 'disabled')),
  note TEXT,                               -- The one line the card shows
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  -- Set when someone presses "run now". A job runner clears it and writes
  -- last_synced_at; until one exists the screen only claims a sync was asked
  -- for, which is all this column records.
  sync_requested_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_integrations_tenure_key UNIQUE (tenure_id, key)
);

CREATE TRIGGER trg_integrations_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Integration Conflicts Table
-- ------------------------------------------------------------------------------
-- The things a sync could not decide on its own. Kept after resolution rather
-- than deleted, so "this keeps happening" is answerable.
CREATE TABLE IF NOT EXISTS integration_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID NOT NULL REFERENCES tenures(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,                   -- e.g. 'Two files named "Techfest backdrop final"'
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_integration_conflicts_updated_at
BEFORE UPDATE ON integration_conflicts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_occasions_tenure ON occasions(tenure_id);
CREATE INDEX IF NOT EXISTS idx_occasions_type ON occasions(tenure_id, occasion_type);
CREATE INDEX IF NOT EXISTS idx_integrations_tenure ON integrations(tenure_id);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_open
  ON integration_conflicts(integration_id) WHERE resolved_at IS NULL;

-- ------------------------------------------------------------------------------
-- 5. Row Level Security
-- ------------------------------------------------------------------------------
-- NOTE FOR STREAM B: placeholders, as in the foundation migration. The real
-- policies gate writes on admin.occasions and admin.integrations.
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "placeholder_occasions_read" ON occasions
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_integrations_read" ON integrations
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "placeholder_integration_conflicts_read" ON integration_conflicts
  FOR SELECT TO authenticated USING (TRUE);
