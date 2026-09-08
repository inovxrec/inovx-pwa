-- ==============================================================================
-- INOVX OPS — THE CLUB, WITHOUT ANY ACCOUNTS
-- supabase/seed_club_only.sql
-- ==============================================================================
--
-- What a hosted project can safely be given: the tenure, its domains, the
-- 39-person directory, the occasion rules and the integrations. Everything the
-- app reads to know what the club IS.
--
-- Deliberately absent: `users` and `auth.users`. Staging is on the public
-- internet, and `seed_local_auth.sql` issues everyone the password `demo` —
-- which is right for a database bound to 127.0.0.1 and wrong for a URL anyone
-- can reach, because until each person changes it their account is guessable
-- from their email address alone.
--
-- So accounts are issued deliberately, one at a time, by
-- `scripts/provision-super-admin.mjs`, which generates a password nobody has
-- read. Run this file first; add people after.
--
-- Safe to run more than once: every statement is an upsert.
--
--   Dashboard -> SQL Editor -> paste -> Run
--   (or: supabase db query --linked --file supabase/seed_club_only.sql)

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

-- The directory is the club's roster. `linked_user_id` is left unset on purpose:
-- there are no accounts yet, and it is filled in when someone is issued one.
-- 9. Member Directory — the same roster, as the club's own list.
-- ClubProvider prefers this over the accounts table, so the two are seeded from
-- one source and cannot disagree. Birthdays are left NULL because nobody has
-- collected them; the occasion engine raises birthday work only once they are in.
INSERT INTO member_directory (id, tenure_id, name, email, domain_id, domain_name, role_label, metadata)
VALUES
  ('77777777-7777-7777-7777-000000000001', '11111111-1111-1111-1111-111111111111', 'Adishwar Seelan S K', 'adishwarseelan.sk.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'President', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000002', '11111111-1111-1111-1111-111111111111', 'Lalitha B', 'lalitha.b.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Vice President', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000003', '11111111-1111-1111-1111-111111111111', 'Subeesh Sekar', 'subeesh.s.2024.bt@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Chief Operating Officer', '{"department": "BT"}'),
  ('77777777-7777-7777-7777-000000000004', '11111111-1111-1111-1111-111111111111', 'Jaiharish D', 'jaiharish.d.2024.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Chief Operating Officer', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000005', '11111111-1111-1111-1111-111111111111', 'Subash R', 'subash.r.2024.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Chief Technical Officer', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000006', '11111111-1111-1111-1111-111111111111', 'Tharika R', 'tharika.r.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Treasurer', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000007', '11111111-1111-1111-1111-111111111111', 'Athithya R', 'athithya.r.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Secretary', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000008', '11111111-1111-1111-1111-111111111111', 'Chandana Shankari', 'chandanashankari.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Event Team Lead', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000009', '11111111-1111-1111-1111-111111111111', 'Pavan Prasad P', 'pavanprasad.p.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000010', '11111111-1111-1111-1111-111111111111', 'Sanjana Banerjee', 'sanjanabanerjee.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000011', '11111111-1111-1111-1111-111111111111', 'Katelyn Sanjana Khanna', 'katelynsanjanakhanna.2025.csd@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '{"department": "CSD"}'),
  ('77777777-7777-7777-7777-000000000012', '11111111-1111-1111-1111-111111111111', 'Devanand C', 'devanand.c.2025.eee@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '{"department": "EEE"}'),
  ('77777777-7777-7777-7777-000000000013', '11111111-1111-1111-1111-111111111111', 'Saranya B', 'saranya.b.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000014', '11111111-1111-1111-1111-111111111111', 'Gayathri S', 'gayathri.s1.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000015', '11111111-1111-1111-1111-111111111111', 'Abirami G', 'abirami.g.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000016', '11111111-1111-1111-1111-111111111111', 'Ashwini S', 'assvine.s.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Management Team Lead', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000017', '11111111-1111-1111-1111-111111111111', 'Praveen Sundar R', 'praveensundar.r.2025.eee@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '{"department": "EEE"}'),
  ('77777777-7777-7777-7777-000000000018', '11111111-1111-1111-1111-111111111111', 'Mohamed Irfan S', 'mohamedirfan.s.2025.csecs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '{"department": "CSECS"}'),
  ('77777777-7777-7777-7777-000000000019', '11111111-1111-1111-1111-111111111111', 'Vijayalakshmi Radhakrishnan', 'vijayalakshmiradhakrishnan.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000020', '11111111-1111-1111-1111-111111111111', 'Chithra S P', 'chithra.sp.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000021', '11111111-1111-1111-1111-111111111111', 'Asra Fathima S', 'asrafathima.s.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000022', '11111111-1111-1111-1111-111111111111', 'Ragamithra K B', 'ragamithra.kb.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Media Team Lead', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000023', '11111111-1111-1111-1111-111111111111', 'Lingeesh L', 'lingeesh.l.2025.ft@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Member', '{"department": "FT"}'),
  ('77777777-7777-7777-7777-000000000024', '11111111-1111-1111-1111-111111111111', 'Kolakaleti Jeethesh Sri Phani', 'kolakaletijeetheshsriphani.2025.csd@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Member', '{"department": "CSD"}'),
  ('77777777-7777-7777-7777-000000000025', '11111111-1111-1111-1111-111111111111', 'Poshitha S', 'poshitha.s.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Member', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000026', '11111111-1111-1111-1111-111111111111', 'Sandhiya P', 'sandhiya.p.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Design Team Lead', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000027', '11111111-1111-1111-1111-111111111111', 'Visal G', 'visal.g.2025.mech@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Member', '{"department": "MECH"}'),
  ('77777777-7777-7777-7777-000000000028', '11111111-1111-1111-1111-111111111111', 'Pooja R', 'pooja.r.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Member', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000029', '11111111-1111-1111-1111-111111111111', 'Sree Vishal K S', 'sreevishal.ks.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Member', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000030', '11111111-1111-1111-1111-111111111111', 'Mayank Sharma', 'mayanksharma.2025.aiml@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "AIML"}'),
  ('77777777-7777-7777-7777-000000000031', '11111111-1111-1111-1111-111111111111', 'P R Visshwajit', 'visshwajit.pr.2025.mech@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "MECH"}'),
  ('77777777-7777-7777-7777-000000000032', '11111111-1111-1111-1111-111111111111', 'Akash D', 'akash.d.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000033', '11111111-1111-1111-1111-111111111111', 'Harini S', 'harini.s.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000034', '11111111-1111-1111-1111-111111111111', 'Jaswanth Gunasekaran', 'jaswanthgunasekaran.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000035', '11111111-1111-1111-1111-111111111111', 'K Sanjeev Kumar', 'sanjeevkumar.k.2025.mct@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "MCT"}'),
  ('77777777-7777-7777-7777-000000000036', '11111111-1111-1111-1111-111111111111', 'Harini M', 'harini.m1.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000037', '11111111-1111-1111-1111-111111111111', 'Laxmi Gayathiri S', 'laxmigayathiri.s.2025.aids@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "AIDS"}'),
  ('77777777-7777-7777-7777-000000000038', '11111111-1111-1111-1111-111111111111', 'Bhuvaneswaran S', 'bhuvaneswaran.s.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000039', '11111111-1111-1111-1111-111111111111', 'M S Varun', 'varun.ms.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '{"department": "CSE"}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  domain_id = EXCLUDED.domain_id,
  domain_name = EXCLUDED.domain_name,
  role_label = EXCLUDED.role_label,
  metadata = EXCLUDED.metadata;

-- 10. Feature Flags (Tier-4 "Should" features shipped dark)
INSERT INTO feature_flags (key, name, description, is_enabled, tier)
VALUES
  ('dark_mode_theme', 'Dark Mode Theme', 'Phosphor green on pitch black high-contrast token palette', FALSE, 'tier-4'),
  ('analytics_export', 'Export Command Deck Analytics', 'Download CSV and PDF reports from Command Deck', FALSE, 'tier-4'),
  ('occasion_engine_auto_spawn', 'Occasion Engine Auto-Spawn', 'Automatically create birthday and celebration tasks from directory dates', FALSE, 'tier-4'),
  ('push_notifications_v2', 'Web Push Notifications v2', 'Background Push API service worker alerts for task assignments', FALSE, 'tier-4')
ON CONFLICT (key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- 11. Occasions (the dates that generate work on their own — §9.15)
-- Birthdays come from the directory rather than being typed twice, so a
-- corrected birthday corrects the occasion with it. The lunar rows deliberately
-- have no date: they are what the confirmation queue exists for.
INSERT INTO occasions (tenure_id, name, occasion_type, occasion_date, output_domain_id, lead_days, assignment_strategy, directory_member_id)
SELECT
  md.tenure_id,
  md.name || ' — birthday',
  'birthday',
  TO_CHAR(md.birthday, 'MM-DD'),
  '22222222-2222-2222-2222-000000000005',
  5,
  'domain-lead',
  md.id
FROM member_directory md
WHERE md.tenure_id = '11111111-1111-1111-1111-111111111111'
  AND md.birthday IS NOT NULL
ON CONFLICT (tenure_id, name) DO NOTHING;

INSERT INTO occasions (tenure_id, name, occasion_type, occasion_date, output_domain_id, lead_days, assignment_strategy)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Club foundation day', 'anniversary', '11-14', '22222222-2222-2222-2222-000000000004', 10, 'domain-lead'),
  ('11111111-1111-1111-1111-111111111111', 'Diwali', 'lunar', NULL, '22222222-2222-2222-2222-000000000005', 14, 'domain-lead'),
  ('11111111-1111-1111-1111-111111111111', 'Eid', 'lunar', NULL, '22222222-2222-2222-2222-000000000005', 14, 'round-robin'),
  ('11111111-1111-1111-1111-111111111111', 'Engineers Day', 'festival', '09-15', '22222222-2222-2222-2222-000000000001', 7, 'round-robin')
ON CONFLICT (tenure_id, name) DO NOTHING;

-- 12. Integrations and their open conflicts (§9.15)
INSERT INTO integrations (id, tenure_id, key, name, status, note, last_synced_at)
VALUES
  ('66666666-6666-6666-6666-000000000001', '11111111-1111-1111-1111-111111111111', 'google-drive', 'Google Drive', 'degraded', 'Deliverable links stopped resolving three days ago.', NOW() - INTERVAL '74 hours'),
  ('66666666-6666-6666-6666-000000000002', '11111111-1111-1111-1111-111111111111', 'college-erp', 'College ERP roster', 'ok', 'Member roster and enrolment, pulled nightly.', NOW() - INTERVAL '6 hours'),
  ('66666666-6666-6666-6666-000000000003', '11111111-1111-1111-1111-111111111111', 'calendar', 'Shared calendar', 'ok', 'Meetings and deadlines pushed to the club calendar.', NOW() - INTERVAL '2 hours')
ON CONFLICT (tenure_id, key) DO NOTHING;

INSERT INTO integration_conflicts (tenure_id, integration_id, summary)
VALUES
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-000000000001', 'Two files named "Techfest backdrop final"'),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-000000000001', 'Poster folder shared with a link nobody owns')
ON CONFLICT DO NOTHING;
