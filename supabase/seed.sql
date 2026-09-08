-- ==============================================================================
-- INOVX OPS — STREAM A: SEED DATA
-- supabase/seed.sql
--
-- Populates:
-- 1. 1 Active Academic Tenure (2026-2027)
-- 2. The 5 Official Domains + Core Ops
-- 3. The club's roster, from the member sheet (39 people)
-- 4. The member directory, mirroring that roster
-- 5. Occasions, integrations and feature flags
--
-- No sample committees or tasks: the board starts empty and the club fills it.
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

-- 3. Users — the club's actual roster (see the member sheet).
-- Everyone is issued the same first password and must change it (§9.2); the
-- accounts themselves are created in seed_local_auth.sql, which reuses these ids.
-- Only the President and Vice President are super admins. The rest of the core
-- team are admins. Domain leads hold no admin key — they run a board.
INSERT INTO users (id, tenure_id, email, name, initials, role, domain_id, domain, position_title, status, must_change_password)
VALUES
  ('33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-111111111111', 'adishwarseelan.sk.2024.csbs@rajalakshmi.edu.in', 'Adishwar Seelan S K', 'AS', 'super_admin', '22222222-2222-2222-2222-000000000006', 'core', 'President', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000008', '11111111-1111-1111-1111-111111111111', 'lalitha.b.2024.csbs@rajalakshmi.edu.in', 'Lalitha B', 'LB', 'super_admin', '22222222-2222-2222-2222-000000000006', 'core', 'Vice President', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000003', '11111111-1111-1111-1111-111111111111', 'subeesh.s.2024.bt@rajalakshmi.edu.in', 'Subeesh Sekar', 'SS', 'admin', '22222222-2222-2222-2222-000000000006', 'core', 'Chief Operating Officer', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000009', '11111111-1111-1111-1111-111111111111', 'jaiharish.d.2024.cse@rajalakshmi.edu.in', 'Jaiharish D', 'JD', 'admin', '22222222-2222-2222-2222-000000000006', 'core', 'Chief Operating Officer', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000002', '11111111-1111-1111-1111-111111111111', 'subash.r.2024.cse@rajalakshmi.edu.in', 'Subash R', 'SR', 'admin', '22222222-2222-2222-2222-000000000006', 'core', 'Chief Technical Officer', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000010', '11111111-1111-1111-1111-111111111111', 'tharika.r.2024.csbs@rajalakshmi.edu.in', 'Tharika R', 'TR', 'admin', '22222222-2222-2222-2222-000000000006', 'core', 'Treasurer', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000011', '11111111-1111-1111-1111-111111111111', 'athithya.r.2024.csbs@rajalakshmi.edu.in', 'Athithya R', 'AR', 'admin', '22222222-2222-2222-2222-000000000006', 'core', 'Secretary', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000005', '11111111-1111-1111-1111-111111111111', 'chandanashankari.2025.it@rajalakshmi.edu.in', 'Chandana Shankari', 'CS', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Event Team Lead', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000012', '11111111-1111-1111-1111-111111111111', 'pavanprasad.p.2025.it@rajalakshmi.edu.in', 'Pavan Prasad P', 'PP', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000013', '11111111-1111-1111-1111-111111111111', 'sanjanabanerjee.2025.cse@rajalakshmi.edu.in', 'Sanjana Banerjee', 'SB', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000014', '11111111-1111-1111-1111-111111111111', 'katelynsanjanakhanna.2025.csd@rajalakshmi.edu.in', 'Katelyn Sanjana Khanna', 'KS', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000015', '11111111-1111-1111-1111-111111111111', 'devanand.c.2025.eee@rajalakshmi.edu.in', 'Devanand C', 'DC', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000016', '11111111-1111-1111-1111-111111111111', 'saranya.b.2025.csbs@rajalakshmi.edu.in', 'Saranya B', 'SB', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000017', '11111111-1111-1111-1111-111111111111', 'gayathri.s1.2025.cse@rajalakshmi.edu.in', 'Gayathri S', 'GS', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000018', '11111111-1111-1111-1111-111111111111', 'abirami.g.2025.it@rajalakshmi.edu.in', 'Abirami G', 'AG', 'member', '22222222-2222-2222-2222-000000000003', 'events', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000019', '11111111-1111-1111-1111-111111111111', 'assvine.s.2025.csbs@rajalakshmi.edu.in', 'Ashwini S', 'AS', 'member', '22222222-2222-2222-2222-000000000002', 'management', 'Management Team Lead', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000020', '11111111-1111-1111-1111-111111111111', 'praveensundar.r.2025.eee@rajalakshmi.edu.in', 'Praveen Sundar R', 'PS', 'member', '22222222-2222-2222-2222-000000000002', 'management', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000021', '11111111-1111-1111-1111-111111111111', 'mohamedirfan.s.2025.csecs@rajalakshmi.edu.in', 'Mohamed Irfan S', 'MI', 'member', '22222222-2222-2222-2222-000000000002', 'management', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000022', '11111111-1111-1111-1111-111111111111', 'vijayalakshmiradhakrishnan.2025.csbs@rajalakshmi.edu.in', 'Vijayalakshmi Radhakrishnan', 'VR', 'member', '22222222-2222-2222-2222-000000000002', 'management', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000023', '11111111-1111-1111-1111-111111111111', 'chithra.sp.2025.it@rajalakshmi.edu.in', 'Chithra S P', 'CS', 'member', '22222222-2222-2222-2222-000000000002', 'management', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000024', '11111111-1111-1111-1111-111111111111', 'asrafathima.s.2025.csbs@rajalakshmi.edu.in', 'Asra Fathima S', 'AF', 'member', '22222222-2222-2222-2222-000000000002', 'management', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000025', '11111111-1111-1111-1111-111111111111', 'ragamithra.kb.2025.csbs@rajalakshmi.edu.in', 'Ragamithra K B', 'RK', 'member', '22222222-2222-2222-2222-000000000004', 'media', 'Media Team Lead', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000026', '11111111-1111-1111-1111-111111111111', 'lingeesh.l.2025.ft@rajalakshmi.edu.in', 'Lingeesh L', 'LL', 'member', '22222222-2222-2222-2222-000000000004', 'media', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000027', '11111111-1111-1111-1111-111111111111', 'kolakaletijeetheshsriphani.2025.csd@rajalakshmi.edu.in', 'Kolakaleti Jeethesh Sri Phani', 'KJ', 'member', '22222222-2222-2222-2222-000000000004', 'media', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000028', '11111111-1111-1111-1111-111111111111', 'poshitha.s.2025.cse@rajalakshmi.edu.in', 'Poshitha S', 'PS', 'member', '22222222-2222-2222-2222-000000000004', 'media', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000004', '11111111-1111-1111-1111-111111111111', 'sandhiya.p.2025.csbs@rajalakshmi.edu.in', 'Sandhiya P', 'SP', 'member', '22222222-2222-2222-2222-000000000005', 'design', 'Design Team Lead', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000029', '11111111-1111-1111-1111-111111111111', 'visal.g.2025.mech@rajalakshmi.edu.in', 'Visal G', 'VG', 'member', '22222222-2222-2222-2222-000000000005', 'design', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000007', '11111111-1111-1111-1111-111111111111', 'pooja.r.2025.csbs@rajalakshmi.edu.in', 'Pooja R', 'PR', 'member', '22222222-2222-2222-2222-000000000005', 'design', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000030', '11111111-1111-1111-1111-111111111111', 'sreevishal.ks.2025.it@rajalakshmi.edu.in', 'Sree Vishal K S', 'SV', 'member', '22222222-2222-2222-2222-000000000005', 'design', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000006', '11111111-1111-1111-1111-111111111111', 'mayanksharma.2025.aiml@rajalakshmi.edu.in', 'Mayank Sharma', 'MS', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000031', '11111111-1111-1111-1111-111111111111', 'visshwajit.pr.2025.mech@rajalakshmi.edu.in', 'P R Visshwajit', 'PR', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000032', '11111111-1111-1111-1111-111111111111', 'akash.d.2025.csbs@rajalakshmi.edu.in', 'Akash D', 'AD', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000033', '11111111-1111-1111-1111-111111111111', 'harini.s.2025.cse@rajalakshmi.edu.in', 'Harini S', 'HS', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000034', '11111111-1111-1111-1111-111111111111', 'jaswanthgunasekaran.2025.cse@rajalakshmi.edu.in', 'Jaswanth Gunasekaran', 'JG', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000035', '11111111-1111-1111-1111-111111111111', 'sanjeevkumar.k.2025.mct@rajalakshmi.edu.in', 'K Sanjeev Kumar', 'KS', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000036', '11111111-1111-1111-1111-111111111111', 'harini.m1.2025.cse@rajalakshmi.edu.in', 'Harini M', 'HM', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000037', '11111111-1111-1111-1111-111111111111', 'laxmigayathiri.s.2025.aids@rajalakshmi.edu.in', 'Laxmi Gayathiri S', 'LG', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000038', '11111111-1111-1111-1111-111111111111', 'bhuvaneswaran.s.2025.cse@rajalakshmi.edu.in', 'Bhuvaneswaran S', 'BS', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE),
  ('33333333-3333-3333-3333-000000000039', '11111111-1111-1111-1111-111111111111', 'varun.ms.2025.cse@rajalakshmi.edu.in', 'M S Varun', 'MS', 'member', '22222222-2222-2222-2222-000000000001', 'technical', 'Member', 'active', TRUE)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  initials = EXCLUDED.initials,
  role = EXCLUDED.role,
  domain_id = EXCLUDED.domain_id,
  domain = EXCLUDED.domain,
  position_title = EXCLUDED.position_title;

-- Domain leads. Technical is led by the CTO, who is also the tech team lead.
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000002' WHERE slug = 'technical';
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000019' WHERE slug = 'management';
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000005' WHERE slug = 'events';
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000025' WHERE slug = 'media';
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000004' WHERE slug = 'design';
UPDATE domains SET lead_user_id = '33333333-3333-3333-3333-000000000001' WHERE slug = 'core';

-- 4-8. Committees, tasks and their contents — deliberately not seeded.
--
-- These used to hold a scaffold's worth of invented work: two committees, five
-- tasks with checklists and assignees, and an activity log describing decisions
-- nobody made. One of them was a birthday poster for a person who is not in the
-- club. A board that opens with fabricated work on it teaches people to
-- distrust what they read there, and there is no honest way to tell them which
-- rows are real.
--
-- So the club starts with an empty board and fills it with its own work. The
-- schema for all of it is in the foundation migration; nothing is missing but
-- rows. Committees are created from the board screen, tasks from NEW TASK.

-- 9. Member Directory — the same roster, as the club's own list.
-- ClubProvider prefers this over the accounts table, so the two are seeded from
-- one source and cannot disagree. Birthdays are left NULL because nobody has
-- collected them; the occasion engine raises birthday work only once they are in.
INSERT INTO member_directory (id, tenure_id, name, email, domain_id, domain_name, role_label, linked_user_id, metadata)
VALUES
  ('77777777-7777-7777-7777-000000000001', '11111111-1111-1111-1111-111111111111', 'Adishwar Seelan S K', 'adishwarseelan.sk.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'President', '33333333-3333-3333-3333-000000000001', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000002', '11111111-1111-1111-1111-111111111111', 'Lalitha B', 'lalitha.b.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Vice President', '33333333-3333-3333-3333-000000000008', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000003', '11111111-1111-1111-1111-111111111111', 'Subeesh Sekar', 'subeesh.s.2024.bt@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Chief Operating Officer', '33333333-3333-3333-3333-000000000003', '{"department": "BT"}'),
  ('77777777-7777-7777-7777-000000000004', '11111111-1111-1111-1111-111111111111', 'Jaiharish D', 'jaiharish.d.2024.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Chief Operating Officer', '33333333-3333-3333-3333-000000000009', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000005', '11111111-1111-1111-1111-111111111111', 'Subash R', 'subash.r.2024.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Chief Technical Officer', '33333333-3333-3333-3333-000000000002', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000006', '11111111-1111-1111-1111-111111111111', 'Tharika R', 'tharika.r.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Treasurer', '33333333-3333-3333-3333-000000000010', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000007', '11111111-1111-1111-1111-111111111111', 'Athithya R', 'athithya.r.2024.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000006', 'Core Ops', 'Secretary', '33333333-3333-3333-3333-000000000011', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000008', '11111111-1111-1111-1111-111111111111', 'Chandana Shankari', 'chandanashankari.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Event Team Lead', '33333333-3333-3333-3333-000000000005', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000009', '11111111-1111-1111-1111-111111111111', 'Pavan Prasad P', 'pavanprasad.p.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '33333333-3333-3333-3333-000000000012', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000010', '11111111-1111-1111-1111-111111111111', 'Sanjana Banerjee', 'sanjanabanerjee.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '33333333-3333-3333-3333-000000000013', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000011', '11111111-1111-1111-1111-111111111111', 'Katelyn Sanjana Khanna', 'katelynsanjanakhanna.2025.csd@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '33333333-3333-3333-3333-000000000014', '{"department": "CSD"}'),
  ('77777777-7777-7777-7777-000000000012', '11111111-1111-1111-1111-111111111111', 'Devanand C', 'devanand.c.2025.eee@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '33333333-3333-3333-3333-000000000015', '{"department": "EEE"}'),
  ('77777777-7777-7777-7777-000000000013', '11111111-1111-1111-1111-111111111111', 'Saranya B', 'saranya.b.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '33333333-3333-3333-3333-000000000016', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000014', '11111111-1111-1111-1111-111111111111', 'Gayathri S', 'gayathri.s1.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '33333333-3333-3333-3333-000000000017', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000015', '11111111-1111-1111-1111-111111111111', 'Abirami G', 'abirami.g.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000003', 'Events', 'Member', '33333333-3333-3333-3333-000000000018', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000016', '11111111-1111-1111-1111-111111111111', 'Ashwini S', 'assvine.s.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Management Team Lead', '33333333-3333-3333-3333-000000000019', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000017', '11111111-1111-1111-1111-111111111111', 'Praveen Sundar R', 'praveensundar.r.2025.eee@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '33333333-3333-3333-3333-000000000020', '{"department": "EEE"}'),
  ('77777777-7777-7777-7777-000000000018', '11111111-1111-1111-1111-111111111111', 'Mohamed Irfan S', 'mohamedirfan.s.2025.csecs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '33333333-3333-3333-3333-000000000021', '{"department": "CSECS"}'),
  ('77777777-7777-7777-7777-000000000019', '11111111-1111-1111-1111-111111111111', 'Vijayalakshmi Radhakrishnan', 'vijayalakshmiradhakrishnan.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '33333333-3333-3333-3333-000000000022', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000020', '11111111-1111-1111-1111-111111111111', 'Chithra S P', 'chithra.sp.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '33333333-3333-3333-3333-000000000023', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000021', '11111111-1111-1111-1111-111111111111', 'Asra Fathima S', 'asrafathima.s.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000002', 'Management', 'Member', '33333333-3333-3333-3333-000000000024', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000022', '11111111-1111-1111-1111-111111111111', 'Ragamithra K B', 'ragamithra.kb.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Media Team Lead', '33333333-3333-3333-3333-000000000025', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000023', '11111111-1111-1111-1111-111111111111', 'Lingeesh L', 'lingeesh.l.2025.ft@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Member', '33333333-3333-3333-3333-000000000026', '{"department": "FT"}'),
  ('77777777-7777-7777-7777-000000000024', '11111111-1111-1111-1111-111111111111', 'Kolakaleti Jeethesh Sri Phani', 'kolakaletijeetheshsriphani.2025.csd@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Member', '33333333-3333-3333-3333-000000000027', '{"department": "CSD"}'),
  ('77777777-7777-7777-7777-000000000025', '11111111-1111-1111-1111-111111111111', 'Poshitha S', 'poshitha.s.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000004', 'Media & PR', 'Member', '33333333-3333-3333-3333-000000000028', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000026', '11111111-1111-1111-1111-111111111111', 'Sandhiya P', 'sandhiya.p.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Design Team Lead', '33333333-3333-3333-3333-000000000004', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000027', '11111111-1111-1111-1111-111111111111', 'Visal G', 'visal.g.2025.mech@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Member', '33333333-3333-3333-3333-000000000029', '{"department": "MECH"}'),
  ('77777777-7777-7777-7777-000000000028', '11111111-1111-1111-1111-111111111111', 'Pooja R', 'pooja.r.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Member', '33333333-3333-3333-3333-000000000007', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000029', '11111111-1111-1111-1111-111111111111', 'Sree Vishal K S', 'sreevishal.ks.2025.it@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000005', 'Design', 'Member', '33333333-3333-3333-3333-000000000030', '{"department": "IT"}'),
  ('77777777-7777-7777-7777-000000000030', '11111111-1111-1111-1111-111111111111', 'Mayank Sharma', 'mayanksharma.2025.aiml@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000006', '{"department": "AIML"}'),
  ('77777777-7777-7777-7777-000000000031', '11111111-1111-1111-1111-111111111111', 'P R Visshwajit', 'visshwajit.pr.2025.mech@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000031', '{"department": "MECH"}'),
  ('77777777-7777-7777-7777-000000000032', '11111111-1111-1111-1111-111111111111', 'Akash D', 'akash.d.2025.csbs@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000032', '{"department": "CSBS"}'),
  ('77777777-7777-7777-7777-000000000033', '11111111-1111-1111-1111-111111111111', 'Harini S', 'harini.s.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000033', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000034', '11111111-1111-1111-1111-111111111111', 'Jaswanth Gunasekaran', 'jaswanthgunasekaran.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000034', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000035', '11111111-1111-1111-1111-111111111111', 'K Sanjeev Kumar', 'sanjeevkumar.k.2025.mct@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000035', '{"department": "MCT"}'),
  ('77777777-7777-7777-7777-000000000036', '11111111-1111-1111-1111-111111111111', 'Harini M', 'harini.m1.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000036', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000037', '11111111-1111-1111-1111-111111111111', 'Laxmi Gayathiri S', 'laxmigayathiri.s.2025.aids@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000037', '{"department": "AIDS"}'),
  ('77777777-7777-7777-7777-000000000038', '11111111-1111-1111-1111-111111111111', 'Bhuvaneswaran S', 'bhuvaneswaran.s.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000038', '{"department": "CSE"}'),
  ('77777777-7777-7777-7777-000000000039', '11111111-1111-1111-1111-111111111111', 'M S Varun', 'varun.ms.2025.cse@rajalakshmi.edu.in', '22222222-2222-2222-2222-000000000001', 'Technical', 'Member', '33333333-3333-3333-3333-000000000039', '{"department": "CSE"}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  domain_id = EXCLUDED.domain_id,
  domain_name = EXCLUDED.domain_name,
  role_label = EXCLUDED.role_label,
  linked_user_id = EXCLUDED.linked_user_id,
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
