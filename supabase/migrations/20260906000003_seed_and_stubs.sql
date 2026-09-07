-- ============================================================================
-- INOVX OPS - MIGRATION 003: SEED TEST DATA & DELEGATED LEAD ROLES
-- Author: Member B (Permissions, Visibility & Audit)
-- ============================================================================

-- Ensure test users exist with all 4 roles
INSERT INTO public.users (id, email, name, role, domain, position_title)
VALUES
    ('d3b07384-d113-4602-9c8e-000000000001', 'varun@inovx.club', 'Varun Sharma', 'super_admin', 'core', 'President'),
    ('d3b07384-d113-4602-9c8e-000000000002', 'sanjeev@inovx.club', 'Sanjeev Varma', 'admin', 'technical', 'Tech Lead'),
    ('d3b07384-d113-4602-9c8e-000000000003', 'faculty@rec.ac.in', 'Dr. Radhakrishnan', 'faculty', 'core', 'Faculty In-Charge'),
    ('d3b07384-d113-4602-9c8e-000000000004', 'riya@inovx.club', 'Riya Sen', 'member', 'design', 'Domain Lead (Design)'),
    ('d3b07384-d113-4602-9c8e-000000000005', 'karan@inovx.club', 'Karan Mehta', 'member', 'events', 'Domain Lead (Events)'),
    ('d3b07384-d113-4602-9c8e-000000000006', 'ananya@inovx.club', 'Ananya Rao', 'member', 'media', 'Media Coordinator')
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, domain = EXCLUDED.domain, position_title = EXCLUDED.position_title;

-- Seed Delegated Approvals for Domain Leads (FR-TASK-9)
-- Gives Riya (Design Lead) and Karan (Events Lead) 'task.approve' authority via user_permissions
INSERT INTO public.user_permissions (user_id, permission_key, is_granted, granted_by)
VALUES
    ('d3b07384-d113-4602-9c8e-000000000004', 'task.approve', true, 'd3b07384-d113-4602-9c8e-000000000001'),
    ('d3b07384-d113-4602-9c8e-000000000005', 'task.approve', true, 'd3b07384-d113-4602-9c8e-000000000001')
ON CONFLICT (user_id, permission_key) DO UPDATE
SET is_granted = EXCLUDED.is_granted;

-- Seed Initial Audit Log Entry (FR-ROLE-3)
INSERT INTO public.audit_log (actor_id, entity_type, entity_id, action, diff)
VALUES
    (
        'd3b07384-d113-4602-9c8e-000000000001',
        'user_permissions',
        'd3b07384-d113-4602-9c8e-000000000004',
        'GRANT',
        '{"permission": "task.approve", "reason": "Delegated Domain Lead approvals (FR-TASK-9)"}'::jsonb
    );
