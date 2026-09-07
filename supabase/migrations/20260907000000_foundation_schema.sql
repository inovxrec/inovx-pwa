-- ============================================================================
-- InovX Ops — database schema (DRAFT v1, CTO Approved)
-- ----------------------------------------------------------------------------
-- This is the brief's §8 data model turned into reviewable DDL. Enum string
-- values match the ones the frontend ALREADY uses (store/taskStore.tsx,
-- layouts/navConfig.ts) so no translation layer is needed on the wire.
--
-- Two structural rules from the brief:
--   1. Every major table carries tenure_id  -> the 2027 archive is a filter,
--      not a migration.
--   2. RLS is enabled on every table; the actual policies are Stream B's build.
--      Enabling RLS with no policy = deny-all (secure default). Stream B adds
--      read/write policies derived from the permission matrix (see 002_seed).
--
-- What is deliberately NOT in this file (it's logic, not shape — your team
-- builds it): RLS policies, the effective_permission() resolver, DB triggers
-- for the activity trail, and the recurring/birthday/digest generators.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------- enums -----------------------------------------------------------
-- NOTE: frontend Role has only 3 values today (member/admin/faculty).
-- The brief needs 4. super_admin is added here; the frontend must catch up
-- (see report §13).
create type user_role          as enum ('super_admin','admin','member','faculty');
create type user_status        as enum ('active','deactivated');   -- deactivation is SOFT

-- matches frontend TaskStatus EXACTLY, plus 'cancelled' which the brief lists
-- as a terminal state but the frontend TaskStatus is currently missing (flag it).
create type task_status        as enum ('todo','progress','review','done','blocked','cancelled','proposed');
create type task_priority      as enum ('urgent','high','medium','low');   -- matches frontend
create type task_context       as enum ('domain','committee');             -- what a task/board belongs to

create type board_visibility   as enum ('private','club_visible','shared_with');
create type scope_kind         as enum ('club','domain','committee');      -- meetings & announcements

create type recurrence_freq    as enum ('daily','weekly','fortnightly','monthly','yearly','every_n_days');
create type assignment_strategy as enum ('fixed','round_robin','whole_group','unassigned_queue');
create type recurring_source   as enum ('interval','data_driven');         -- data_driven = the birthday mechanism

create type attendance_status  as enum ('present','absent','excused');
create type notification_channel as enum ('in_app','push','email');
create type tenure_status       as enum ('active','archived');
create type retention_choice    as enum ('undecided','retain','delete');

create type feature_flag_tier  as enum ('tier-1','tier-2','tier-3','tier-4','experimental');
create type import_status       as enum ('pending','processing','completed','failed');

-- ---------- tenures (everything points here) --------------------------------
create table tenures (
  id              uuid primary key default gen_random_uuid(),
  label           text not null,               -- e.g. "2026-27"
  starts_on       date,
  ends_on         date,
  status          tenure_status not null default 'active',
  archived_at     timestamptz,
  retention       retention_choice not null default 'undecided',
  archive_export  jsonb                          -- snapshot written when a tenure closes
);

-- ---------- domains (a TABLE, not an enum — super admins add/rename/archive) -
-- The frontend currently hardcodes 6 domain keys as a string union; long term
-- that should read this table. For launch we seed the brief's 5 + core (002_seed).
create table domains (
  id           uuid primary key default gen_random_uuid(),
  key          text not null,                    -- 'technical','design',...  (matches frontend Domain)
  name         text not null,                    -- 'Technical','Design',...
  lead_user_id uuid,                             -- FK added after users exists (below)
  visibility   board_visibility not null default 'private',
  archived     boolean not null default false,
  tenure_id    uuid not null references tenures(id),
  unique (tenure_id, key)
);

-- ---------- users (mirrors Supabase auth.users) -----------------------------
create table users (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null unique,
  name                  text not null,
  initials              text,                     -- frontend Session.initials
  domain_id             uuid references domains(id),   -- exactly one domain (brief)
  role                  user_role not null default 'member',
  position_title        text,
  status                user_status not null default 'active',
  must_change_password  boolean not null default true, -- gates the router on first login
  tenure_id             uuid not null references tenures(id)
);
alter table domains add constraint domains_lead_fk
  foreign key (lead_user_id) references users(id);

-- ---------- permissions: catalogue + matrix + per-person overrides ----------
-- The matrix (role defaults + what's grantable) is seeded in 002_seed from the
-- brief's permission table. The resolver that combines these is Stream B.
create table permissions (
  key          text primary key,                 -- 'task.view.all', 'permission.grant', ...
  label        text not null,
  description  text
);

create table role_permission_matrix (
  role            user_role not null,
  permission_key  text not null references permissions(key),
  default_on      boolean not null,   -- true  = on by default for this role  (brief: ✓)
                                      -- false = OFF but a super admin may grant it (brief: ○)
                                      -- absent row = never available to this role (brief: —)
  primary key (role, permission_key)
);

create table user_permissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id),
  permission_key  text not null references permissions(key),
  granted         boolean not null,   -- true = grant, false = revoke (overrides role default)
  scope           jsonb,              -- e.g. {"domains":["events"]} for scoped view grants
  set_by          uuid references users(id),
  set_at          timestamptz not null default now(),
  unique (user_id, permission_key)
);

-- ---------- committees ------------------------------------------------------
create table committees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  purpose       text,
  linked_event  text,
  starts_on     date,
  expected_end  date,
  visibility    board_visibility not null default 'private',
  archived      boolean not null default false,
  tenure_id     uuid not null references tenures(id)
);
create table committee_members (
  committee_id     uuid not null references committees(id),
  user_id          uuid not null references users(id),
  is_coordinator   boolean not null default false,  -- coordinator = admin scoped to THIS committee only
  primary key (committee_id, user_id)
);

-- ---------- recurring engine ------------------------------------------------
create table recurring_rules (
  id               uuid primary key default gen_random_uuid(),
  title_template   text not null,
  desc_template    text,
  context_type     task_context not null,
  context_id       uuid not null,
  frequency        recurrence_freq not null,
  weekdays         int[],                 -- for weekly (0-6)
  every_n_days     int,                   -- for every_n_days
  strategy         assignment_strategy not null default 'fixed',
  assignee_pool    uuid[] default '{}',   -- for fixed / round_robin
  lead_time_days   int not null default 7,-- generate instances this far ahead
  approval_required boolean not null default false,
  source_type      recurring_source not null default 'interval', -- data_driven -> birthday flow
  paused           boolean not null default false,
  tenure_id        uuid not null references tenures(id)
);

-- ---------- tasks + related -------------------------------------------------
create table tasks (
  id               uuid primary key default gen_random_uuid(),
  seq              bigserial,               -- human-readable "#0117" is formatted from this
  title            text not null,
  description      text,                    -- markdown; links auto-detected
  context_type     task_context not null,   -- domain | committee  (replaces frontend's committee?:string)
  context_id       uuid not null,           -- domains.id or committees.id (checked in app + RLS)
  priority         task_priority not null default 'medium',
  due_at           timestamptz,             -- frontend's dueLabel is DERIVED from this, don't store the label
  status           task_status not null default 'todo',
  labels           text[] default '{}',     -- frontend 'tags' / brief 'Labels'
  creator_id       uuid references users(id),
  approval_required boolean not null default false,
  blocked_reason   text,
  recurring_rule_id uuid references recurring_rules(id),
  -- proposal flow: frontend uses status='proposed'; these carry the decision
  proposal_reason  text,
  proposal_decided_by uuid references users(id),
  tenure_id        uuid not null references tenures(id),
  created_at       timestamptz not null default now()
);
-- isOverdue / isBlocked in the frontend are DERIVED, not stored:
--   overdue = due_at < now() and status not in ('done','cancelled')
--   blocked = status = 'blocked'

create table task_assignees (
  task_id      uuid not null references tasks(id) on delete cascade,
  user_id      uuid not null references users(id),
  assigned_by  uuid references users(id),
  assigned_at  timestamptz not null default now(),
  primary key (task_id, user_id)
);
-- NOTE: frontend Task.assignee is singular today; this is many-to-many per the
-- brief (each assignee tracked separately for analytics). Frontend needs to
-- render multiple, or pick a primary (report §13).

create table task_activity (          -- immutable trail; write via trigger so it can't be skipped
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  actor_id    uuid references users(id),
  action      text not null,
  from_val    text,
  to_val      text,
  note        text,
  created_at  timestamptz not null default now()
);

create table task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  author_id   uuid references users(id),
  body        text not null,
  mentions    uuid[] default '{}',    -- @mentions notify regardless of board visibility
  created_at  timestamptz not null default now()
);

create table task_links (             -- deliverables are LINKS ONLY, no uploads anywhere
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references tasks(id) on delete cascade,
  url              text not null,
  label            text,
  detected_provider text,             -- drive|docs|figma|canva|github|... from URL
  added_by         uuid references users(id),
  position         int default 0,     -- kept in add order (draft + final both survive)
  last_checked_at  timestamptz,
  alive            boolean,           -- weekly reachability check; null = unverifiable (perm-gated)
  created_at       timestamptz not null default now()
);

create table task_checklist (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  text        text not null,
  completed   boolean not null default false,
  position    int default 0
);

-- ---------- member directory (separate from users) --------------------------
-- Synced nightly from the club's PUBLIC member-cards Google Sheet. May hold
-- people with no app account. This is what the birthday engine reads.
create table member_directory (
  id            uuid primary key default gen_random_uuid(),
  external_key  text unique,          -- stable key from the sheet, for idempotent sync
  name          text not null,
  dob           date,
  team          text,
  card_url      text,
  photo_url     text,
  conflict_flag boolean not null default false, -- e.g. dob changed -> admin reviews, no silent overwrite
  synced_at     timestamptz
);

-- ---------- meetings, attendance --------------------------------------------
create table meetings (
  id            uuid primary key default gen_random_uuid(),
  scope         scope_kind not null,
  scope_id      uuid,                 -- domain/committee id, null for club
  title         text not null,
  held_at       timestamptz,
  venue         text,                 -- venue or link
  minutes       text,                 -- rich text; action items convert to tasks
  published_at  timestamptz,
  tenure_id     uuid not null references tenures(id)
);
create table attendance (
  meeting_id   uuid not null references meetings(id) on delete cascade,
  user_id      uuid not null references users(id),
  status       attendance_status not null,
  marked_by    uuid references users(id),
  primary key (meeting_id, user_id)
);

-- ---------- announcements ---------------------------------------------------
create table announcements (
  id          uuid primary key default gen_random_uuid(),
  scope       scope_kind not null,
  scope_id    uuid,
  title       text not null,
  body        text,
  pinned      boolean not null default false,
  expires_at  timestamptz,
  sender_id   uuid references users(id),
  created_at  timestamptz not null default now()
);

-- ---------- notifications ---------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id),
  type        text not null,          -- 'assigned','mention','overdue','approval_pending',...
  payload     jsonb,                  -- includes deep-link target so a push opens the right task
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create table notification_prefs (
  user_id       uuid not null references users(id),
  event_type    text not null,
  channel       notification_channel not null,
  enabled       boolean not null default true,
  primary key (user_id, event_type, channel)
);
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id),
  endpoint    text not null,
  keys        jsonb not null,         -- p256dh + auth
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ---------- audit log -------------------------------------------------------
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id),
  entity      text not null,          -- 'user_permissions', 'task', ...
  action      text not null,
  diff        jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- feature flags & bulk imports (Stream A Plumbing) ----------------
create table feature_flags (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  is_enabled  boolean not null default false,
  tier        feature_flag_tier not null default 'tier-4',
  rules       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table pending_imports (
  id            uuid primary key default gen_random_uuid(),
  tenure_id     uuid references tenures(id) on delete cascade,
  batch_id      uuid not null,
  name          text not null,
  email         text not null,
  domain        text not null,
  role          text not null default 'member',
  status        import_status not null default 'pending',
  error_message text,
  imported_by   uuid references users(id) on delete set null,
  processed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- Enable RLS everywhere. Deny-all until Stream B adds policies (secure default).
-- During dev, use the service role or add policies as each stream lands.
-- ============================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Suggested indexes for the hot read paths (My Day, Board, approval queue):
create index on tasks (tenure_id, context_type, context_id, status);
create index on tasks (due_at) where status not in ('done','cancelled');
create index on task_assignees (user_id);
create index on notifications (user_id, read_at);
create index on pending_imports (batch_id, status);
create index on feature_flags (key);
