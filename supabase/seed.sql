-- ==============================================================================
-- INOVX OPS — STREAM A: SEED DATA
-- supabase/seed.sql
--
-- Populates:
-- 1. 1 Active Academic Tenure (2026-2027)
-- 2. The 5 Official Domains + Core Ops
-- 3. Sample Users covering all 4 roles (member, admin, super_admin, faculty)
-- 4. Sample Committees (Techfest, Occasion Engine)
-- 5. Sample Tasks with checklists, assignees, and context
-- 6. Initial Feature Flags (including Tier-4 features shipped dark)
-- ==============================================================================

-- 1. Tenure
INSERT INTO tenures (id, name, start_date, end_date, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '2026-2027',
  '2026-06-01',
  '2027-05-31',
  TRUE
) ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active;

-- 2. Domains
INSERT INTO domains (id, tenure_id, slug, name, color, description)
VALUES
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-111111111111', 'technical', 'Technical', 'var(--chan-technical)', 'Software engineering, cloud infrastructure, and technical workshops'),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-111111111111', 'management', 'Management', 'var(--chan-management)', 'Sponsorships, corporate outreach, budget management, and operational logistics'),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-111111111111', 'events', 'Events', 'var(--chan-events)', 'Hackathons, speaker summits, auditorium bookings, and event coordination'),
  ('22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-111111111111', 'media', 'Media & PR', 'var(--chan-media)', 'Photography, videography, reels, social channels, and public relations'),
  ('22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-111111111111', 'design', 'Design', 'var(--chan-design)', 'UI/UX systems, brand identity, print banners, and creative assets'),
  ('22222222-2222-2222-2222-000000000006', '11111111-1111-1111-1111-111111111111', 'core', 'Core Ops', 'var(--chan-core)', 'Club leadership, strategic oversight, and cross-domain operations')
ON CONFLICT (tenure_id, slug) DO NOTHING;

-- 3. Users (All 4 roles: super_admin, admin, faculty, member)
INSERT INTO users (id, tenure_id, email, name, initials, role, domain_id, domain, position_title, status, must_change_password)
VALUES
  -- super_admin: Executive Lead
  ('33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-111111111111', 'alex@inovx.club', 'Alex Rivera', 'AR', 'super_admin', '22222222-2222-2222-2222-000000000006', 'core', 'Executive Lead', 'active', FALSE),
  -- admin: Technical Lead (Riya Sharma, matches prototype)
  ('33333333-3333-3333-3333-000000000002', '11111111-1111-1111-1111-111111111111', 'riya@inovx.club', 'Riya Sharma', 'RS', 'admin', '22222222-2222-2222-2222-000000000001', 'technical', 'Domain Lead', 'active', FALSE),
  -- faculty: Faculty Advisor (Dr. Nair, matches prototype)
  ('33333333-3333-3333-3333-000000000003', '11111111-1111-1111-1111-111111111111', 'faculty@inovx.club', 'Dr. Nair', 'DN', 'faculty', '22222222-2222-2222-2222-000000000002', 'management', 'Faculty Advisor', 'active', FALSE),
  -- member: Design Lead (Ananya Rao, matches prototype)
  ('33333333-3333-3333-3333-000000000004', '11111111-1111-1111-1111-111111111111', 'member@inovx.club', 'Ananya Rao', 'AR', 'member', '22222222-2222-2222-2222-000000000005', 'design', 'Domain Lead', 'active', FALSE),
  -- member: Events Associate (Karan Mehta)
  ('33333333-3333-3333-3333-000000000005', '11111111-1111-1111-1111-111111111111', 'karan@inovx.club', 'Karan Mehta', 'KM', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Associate', 'active', TRUE),
  -- member: Tech Associate (Mayank Kumar)
  ('33333333-3333-3333-3333-000000000006', '11111111-1111-1111-1111-111111111111', 'mayank@inovx.club', 'Mayank Kumar', 'MK', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Associate', 'active', TRUE),
  -- member: Design Associate (Isha Sengupta)
  ('33333333-3333-3333-3333-000000000007', '11111111-1111-1111-1111-111111111111', 'isha@inovx.club', 'Isha Sengupta', 'IS', 'member', '22222222-2222-2222-2222-000000000005', 'design', 'Associate', 'active', TRUE)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Update domain lead FKs
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000002' WHERE slug = 'technical';
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000004' WHERE slug = 'design';

-- 4. Committees
INSERT INTO committees (id, tenure_id, name, slug, lead_user_id, description)
VALUES
  ('44444444-4444-4444-4444-000000000001', '11111111-1111-1111-1111-111111111111', 'Techfest 2026', 'techfest', '33333333-3333-3333-3333-000000000002', 'Annual national-level collegiate technical symposium'),
  ('44444444-4444-4444-4444-000000000002', '11111111-1111-1111-1111-111111111111', 'Occasion Engine', 'occasion', '33333333-3333-3333-3333-000000000004', 'Birthdays, festive celebrations, and milestones')
ON CONFLICT (tenure_id, slug) DO NOTHING;

-- 5. Tasks (Context polymorphic: points to domain or committee)
INSERT INTO tasks (
  id, tenure_id, task_number, title, description,
  context_type, context_id, domain_id,
  status, priority, due_date, due_label, is_overdue, is_blocked, blocked_reason, tags, created_by
)
VALUES
  (
    '55555555-5555-5555-5555-000000000117',
    '11111111-1111-1111-1111-111111111111',
    '#0117',
    'Confirm auditorium booking and get written approval',
    'Coordinate with Campus Admin for the main-stage auditorium reservation. Requires a formal signature and stamped requisition slip.',
    'committee',
    '44444444-4444-4444-4444-000000000001',
    '22222222-2222-2222-2222-000000000003',
    'blocked',
    'urgent',
    NOW() - INTERVAL '3 days',
    'OVERDUE 3D · 19 AUG',
    TRUE,
    TRUE,
    'Admin office pending Dean''s stamp',
    ARRAY['TECHFEST', 'VENUE'],
    '33333333-3333-3333-3333-000000000002'
  ),
  (
    '55555555-5555-5555-5555-000000000142',
    '11111111-1111-1111-1111-111111111111',
    '#0142',
    'Birthday poster — Ananya Rao',
    'Design a phosphor-styled birthday card for the People page and the announcement feed.',
    'committee',
    '44444444-4444-4444-4444-000000000002',
    '22222222-2222-2222-2222-000000000005',
    'progress',
    'medium',
    NOW(),
    'DUE TODAY',
    FALSE,
    FALSE,
    NULL,
    ARRAY['OCCASION'],
    '33333333-3333-3333-3333-000000000004'
  ),
  (
    '55555555-5555-5555-5555-000000000188',
    '11111111-1111-1111-1111-111111111111',
    '#0188',
    'Techfest key visual — v2',
    'Incorporate typography revisions and render 4K variants for the print banner and Instagram story formats.',
    'committee',
    '44444444-4444-4444-4444-000000000001',
    '22222222-2222-2222-2222-000000000005',
    'review',
    'high',
    NOW() + INTERVAL '2 days',
    'SUBMITTED 20 AUG',
    FALSE,
    FALSE,
    NULL,
    ARRAY['TECHFEST', 'CREATIVE'],
    '33333333-3333-3333-3333-000000000007'
  ),
  (
    '55555555-5555-5555-5555-000000000201',
    '11111111-1111-1111-1111-111111111111',
    '#0201',
    'Redesign the People page avatar grid',
    'Implement dynamic domain-accented borders and a monospace initials grid with fallback avatars.',
    'domain',
    '22222222-2222-2222-2222-000000000001',
    '22222222-2222-2222-2222-000000000001',
    'todo',
    'medium',
    NOW() + INTERVAL '5 days',
    'DUE 30 AUG',
    FALSE,
    FALSE,
    NULL,
    ARRAY['FRONTEND'],
    '33333333-3333-3333-3333-000000000002'
  ),
  (
    '55555555-5555-5555-5555-000000000088',
    '11111111-1111-1111-1111-111111111111',
    '#0088',
    'Setup container cluster for hackathon CI/CD',
    'Configure autoscaling runners on the campus server node to run sandboxed code evaluation for the 36-hour hackathon.',
    'domain',
    '22222222-2222-2222-2222-000000000001',
    '22222222-2222-2222-2222-000000000001',
    'todo',
    'urgent',
    NOW() + INTERVAL '1 day',
    'DUE 01 SEP',
    FALSE,
    FALSE,
    NULL,
    ARRAY['DOCKER', 'INFRA'],
    '33333333-3333-3333-3333-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Task Assignees
INSERT INTO task_assignees (tenure_id, task_id, user_id, is_primary)
VALUES
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000117', '33333333-3333-3333-3333-000000000005', TRUE),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000142', '33333333-3333-3333-3333-000000000004', TRUE),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000188', '33333333-3333-3333-3333-000000000007', TRUE),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000201', '33333333-3333-3333-3333-000000000006', TRUE),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000088', '33333333-3333-3333-3333-000000000001', TRUE)
ON CONFLICT (task_id, user_id) DO NOTHING;

-- 7. Task Checklist Items
INSERT INTO task_checklist (tenure_id, task_id, text, completed, position)
VALUES
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000117', 'Submit requisition form', TRUE, 1),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000117', 'Get Dean endorsement', TRUE, 2),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000117', 'Receive written confirmation & stamp', FALSE, 3),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000142', 'Pull photo from directory', TRUE, 1),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000142', 'Draft layout', FALSE, 2),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000142', 'Get review from lead', FALSE, 3),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000188', 'Revise grid typography', TRUE, 1),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000188', 'Export 9:16 reels canvas', TRUE, 2),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000188', 'Export 300dpi print poster', TRUE, 3)
ON CONFLICT DO NOTHING;

-- 8. Task Activity Logs (Immutable history)
INSERT INTO task_activity (tenure_id, task_id, actor_id, action, message)
VALUES
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000117', '33333333-3333-3333-3333-000000000005', 'blocked', 'Flagged as BLOCKED: Admin office pending Dean stamp'),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000142', '33333333-3333-3333-3333-000000000004', 'created', 'Task spawned automatically by Occasion Engine'),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-000000000188', '33333333-3333-3333-3333-000000000007', 'submitted', 'Submitted for review by Isha S.')
ON CONFLICT DO NOTHING;

-- 9. Member Directory (Can hold members even without login accounts)
INSERT INTO member_directory (tenure_id, name, email, domain_name, role_label, birthday, linked_user_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ananya Rao', 'ananya@inovx.club', 'Design', 'Domain Lead', '2004-09-04', '33333333-3333-3333-3333-000000000004'),
  ('11111111-1111-1111-1111-111111111111', 'Karan Mehta', 'karan@inovx.club', 'Events', 'Associate', '2004-11-12', '33333333-3333-3333-3333-000000000005'),
  ('11111111-1111-1111-1111-111111111111', 'Sanjeev Varma', 'sanjeev@inovx.club', 'Technical', 'Member', '2005-03-22', NULL)
ON CONFLICT DO NOTHING;

-- 10. Feature Flags (Tier-4 "Should" features shipped dark)
INSERT INTO feature_flags (key, name, description, is_enabled, tier)
VALUES
  ('dark_mode_theme', 'Dark Mode Theme', 'Phosphor green on pitch black high-contrast token palette', FALSE, 'tier-4'),
  ('analytics_export', 'Export Command Deck Analytics', 'Download CSV and PDF reports from Command Deck', FALSE, 'tier-4'),
  ('occasion_engine_auto_spawn', 'Occasion Engine Auto-Spawn', 'Automatically create birthday and celebration tasks from directory dates', FALSE, 'tier-4'),
  ('push_notifications_v2', 'Web Push Notifications v2', 'Background Push API service worker alerts for task assignments', FALSE, 'tier-4')
ON CONFLICT (key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
