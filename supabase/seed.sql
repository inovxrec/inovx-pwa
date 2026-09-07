-- ==============================================================================
-- INOVX OPS — STREAM A: SEED DATA (Matching CTO Draft v1 Schema)
-- supabase/seed.sql
-- ==============================================================================

-- 1. Active Tenure
INSERT INTO tenures (id, label, starts_on, ends_on, status, retention)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '2026-27',
  '2026-06-01',
  '2027-05-31',
  'active',
  'undecided'
) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- 2. Domains
INSERT INTO domains (id, tenure_id, key, name, visibility, archived)
VALUES
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-111111111111', 'technical', 'Technical', 'club_visible', false),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-111111111111', 'management', 'Management', 'club_visible', false),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-111111111111', 'events', 'Events', 'club_visible', false),
  ('22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-111111111111', 'media', 'Media & PR', 'club_visible', false),
  ('22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-111111111111', 'design', 'Design', 'club_visible', false),
  ('22222222-2222-2222-2222-000000000006', '11111111-1111-1111-1111-111111111111', 'core', 'Core Ops', 'club_visible', false)
ON CONFLICT (tenure_id, key) DO NOTHING;

-- 3. Users (All 4 roles: super_admin, admin, faculty, member)
INSERT INTO users (id, tenure_id, email, name, initials, domain_id, role, position_title, status, must_change_password)
VALUES
  -- super_admin: Executive Lead
  ('33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-111111111111', 'alex@inovx.club', 'Alex Rivera', 'AR', '22222222-2222-2222-2222-000000000006', 'super_admin', 'Executive Lead', 'active', FALSE),
  -- admin: Technical Lead (Riya Sharma, matches prototype)
  ('33333333-3333-3333-3333-000000000002', '11111111-1111-1111-1111-111111111111', 'riya@inovx.club', 'Riya Sharma', 'RS', '22222222-2222-2222-2222-000000000001', 'admin', 'Domain Lead', 'active', FALSE),
  -- faculty: Faculty Advisor (Dr. Nair, matches prototype)
  ('33333333-3333-3333-3333-000000000003', '11111111-1111-1111-1111-111111111111', 'faculty@inovx.club', 'Dr. Nair', 'DN', '22222222-2222-2222-2222-000000000002', 'faculty', 'Faculty Advisor', 'active', FALSE),
  -- member: Design Lead (Ananya Rao, matches prototype)
  ('33333333-3333-3333-3333-000000000004', '11111111-1111-1111-1111-111111111111', 'member@inovx.club', 'Ananya Rao', 'AR', '22222222-2222-2222-2222-000000000005', 'member', 'Domain Lead', 'active', FALSE),
  -- member: Events Associate (Karan Mehta)
  ('33333333-3333-3333-3333-000000000005', '11111111-1111-1111-1111-111111111111', 'karan@inovx.club', 'Karan Mehta', 'KM', '22222222-2222-2222-2222-000000000003', 'member', 'Associate', 'active', TRUE),
  -- member: Tech Associate (Mayank Kumar)
  ('33333333-3333-3333-3333-000000000006', '11111111-1111-1111-1111-111111111111', 'mayank@inovx.club', 'Mayank Kumar', 'MK', '22222222-2222-2222-2222-000000000001', 'member', 'Associate', 'active', TRUE),
  -- member: Design Associate (Isha Sengupta)
  ('33333333-3333-3333-3333-000000000007', '11111111-1111-1111-1111-111111111111', 'isha@inovx.club', 'Isha Sengupta', 'IS', '22222222-2222-2222-2222-000000000005', 'member', 'Associate', 'active', TRUE)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Update domain lead FKs
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000002' WHERE key = 'technical';
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000004' WHERE key = 'design';

-- 4. Permissions Catalogue & Role Matrix (Stream B Foundation)
INSERT INTO permissions (key, label, description)
VALUES
  ('task.view.all', 'View all boards', 'Can view task boards across all domains'),
  ('task.approve', 'Approve completions', 'Can approve tasks submitted for review'),
  ('recurring.manage', 'Manage recurring rules', 'Can create and configure recurrence schedules'),
  ('user.manage', 'Manage club members', 'Can provision and update member profiles'),
  ('permission.grant', 'Grant permissions', 'Can assign granular permissions to members')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permission_matrix (role, permission_key, default_on)
VALUES
  ('super_admin', 'task.view.all', TRUE),
  ('super_admin', 'task.approve', TRUE),
  ('super_admin', 'recurring.manage', TRUE),
  ('super_admin', 'user.manage', TRUE),
  ('super_admin', 'permission.grant', TRUE),
  ('admin', 'task.view.all', TRUE),
  ('admin', 'task.approve', TRUE),
  ('admin', 'recurring.manage', TRUE),
  ('admin', 'user.manage', TRUE),
  ('admin', 'permission.grant', FALSE),
  ('faculty', 'task.view.all', TRUE),
  ('faculty', 'task.approve', FALSE),
  ('faculty', 'recurring.manage', FALSE),
  ('member', 'task.view.all', FALSE),
  ('member', 'task.approve', FALSE),
  ('member', 'recurring.manage', FALSE)
ON CONFLICT (role, permission_key) DO NOTHING;

-- 5. Committees
INSERT INTO committees (id, tenure_id, name, purpose, linked_event, starts_on, expected_end, visibility, archived)
VALUES
  ('44444444-4444-4444-4444-000000000001', '11111111-1111-1111-1111-111111111111', 'Techfest 2026', 'Annual national-level collegiate technical symposium', 'Techfest 2026', '2026-08-01', '2026-09-15', 'club_visible', false),
  ('44444444-4444-4444-4444-000000000002', '11111111-1111-1111-1111-111111111111', 'Occasion Engine', 'Birthdays, festive celebrations, and milestones', NULL, '2026-06-01', '2027-05-31', 'club_visible', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Tasks
INSERT INTO tasks (
  id, tenure_id, seq, title, description,
  context_type, context_id,
  priority, due_at, status, labels, creator_id, approval_required, blocked_reason
)
VALUES
  (
    '55555555-5555-5555-5555-000000000117',
    '11111111-1111-1111-1111-111111111111',
    117,
    'Confirm auditorium booking and get written approval',
    'Coordinate with Campus Admin for the main-stage auditorium reservation. Requires a formal signature and stamped requisition slip.',
    'committee',
    '44444444-4444-4444-4444-000000000001',
    'urgent',
    NOW() - INTERVAL '3 days',
    'blocked',
    ARRAY['TECHFEST', 'VENUE'],
    '33333333-3333-3333-3333-000000000002',
    TRUE,
    'Admin office pending Dean''s stamp'
  ),
  (
    '55555555-5555-5555-5555-000000000142',
    '11111111-1111-1111-1111-111111111111',
    142,
    'Birthday poster — Ananya Rao',
    'Design a phosphor-styled birthday card for the People page and the announcement feed.',
    'committee',
    '44444444-4444-4444-4444-000000000002',
    'medium',
    NOW(),
    'progress',
    ARRAY['OCCASION'],
    '33333333-3333-3333-3333-000000000004',
    FALSE,
    NULL
  ),
  (
    '55555555-5555-5555-5555-000000000188',
    '11111111-1111-1111-1111-111111111111',
    188,
    'Techfest key visual — v2',
    'Incorporate typography revisions and render 4K variants for the print banner and Instagram story formats.',
    'committee',
    '44444444-4444-4444-4444-000000000001',
    'high',
    NOW() + INTERVAL '2 days',
    'review',
    ARRAY['TECHFEST', 'CREATIVE'],
    '33333333-3333-3333-3333-000000000007',
    TRUE,
    NULL
  ),
  (
    '55555555-5555-5555-5555-000000000201',
    '11111111-1111-1111-1111-111111111111',
    201,
    'Redesign the People page avatar grid',
    'Implement dynamic domain-accented borders and a monospace initials grid with fallback avatars.',
    'domain',
    '22222222-2222-2222-2222-000000000001',
    'medium',
    NOW() + INTERVAL '5 days',
    'todo',
    ARRAY['FRONTEND'],
    '33333333-3333-3333-3333-000000000002',
    FALSE,
    NULL
  ),
  (
    '55555555-5555-5555-5555-000000000088',
    '11111111-1111-1111-1111-111111111111',
    88,
    'Setup container cluster for hackathon CI/CD',
    'Configure autoscaling runners on the campus server node to run sandboxed code evaluation for the 36-hour hackathon.',
    'domain',
    '22222222-2222-2222-2222-000000000001',
    'urgent',
    NOW() + INTERVAL '1 day',
    'todo',
    ARRAY['DOCKER', 'INFRA'],
    '33333333-3333-3333-3333-000000000001',
    FALSE,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Task Assignees
INSERT INTO task_assignees (task_id, user_id)
VALUES
  ('55555555-5555-5555-5555-000000000117', '33333333-3333-3333-3333-000000000005'),
  ('55555555-5555-5555-5555-000000000142', '33333333-3333-3333-3333-000000000004'),
  ('55555555-5555-5555-5555-000000000188', '33333333-3333-3333-3333-000000000007'),
  ('55555555-5555-5555-5555-000000000201', '33333333-3333-3333-3333-000000000006'),
  ('55555555-5555-5555-5555-000000000088', '33333333-3333-3333-3333-000000000001')
ON CONFLICT (task_id, user_id) DO NOTHING;

-- 8. Task Checklist Items
INSERT INTO task_checklist (task_id, text, completed, position)
VALUES
  ('55555555-5555-5555-5555-000000000117', 'Submit requisition form', TRUE, 1),
  ('55555555-5555-5555-5555-000000000117', 'Get Dean endorsement', TRUE, 2),
  ('55555555-5555-5555-5555-000000000117', 'Receive written confirmation & stamp', FALSE, 3),
  ('55555555-5555-5555-5555-000000000142', 'Pull photo from directory', TRUE, 1),
  ('55555555-5555-5555-5555-000000000142', 'Draft layout', FALSE, 2),
  ('55555555-5555-5555-5555-000000000142', 'Get review from lead', FALSE, 3),
  ('55555555-5555-5555-5555-000000000188', 'Revise grid typography', TRUE, 1),
  ('55555555-5555-5555-5555-000000000188', 'Export 9:16 reels canvas', TRUE, 2),
  ('55555555-5555-5555-5555-000000000188', 'Export 300dpi print poster', TRUE, 3)
ON CONFLICT DO NOTHING;

-- 9. Task Activity Logs (Immutable trail)
INSERT INTO task_activity (task_id, actor_id, action, note)
VALUES
  ('55555555-5555-5555-5555-000000000117', '33333333-3333-3333-3333-000000000005', 'status_change', 'Flagged as BLOCKED: Admin office pending Dean stamp'),
  ('55555555-5555-5555-5555-000000000142', '33333333-3333-3333-3333-000000000004', 'created', 'Task spawned automatically by Occasion Engine'),
  ('55555555-5555-5555-5555-000000000188', '33333333-3333-3333-3333-000000000007', 'submitted', 'Submitted for review by Isha S.')
ON CONFLICT DO NOTHING;

-- 10. Member Directory
INSERT INTO member_directory (name, dob, team)
VALUES
  ('Ananya Rao', '2004-09-04', 'Design'),
  ('Karan Mehta', '2004-11-12', 'Events'),
  ('Sanjeev Varma', '2005-03-22', 'Technical')
ON CONFLICT DO NOTHING;

-- 11. Feature Flags (Tier-4 "Should" features shipped dark)
INSERT INTO feature_flags (key, name, description, is_enabled, tier)
VALUES
  ('dark_mode_theme', 'Dark Mode Theme', 'Phosphor green on pitch black high-contrast token palette', FALSE, 'tier-4'),
  ('analytics_export', 'Export Command Deck Analytics', 'Download CSV and PDF reports from Command Deck', FALSE, 'tier-4'),
  ('occasion_engine_auto_spawn', 'Occasion Engine Auto-Spawn', 'Automatically create birthday and celebration tasks from directory dates', FALSE, 'tier-4'),
  ('push_notifications_v2', 'Web Push Notifications v2', 'Background Push API service worker alerts for task assignments', FALSE, 'tier-4')
ON CONFLICT (key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
