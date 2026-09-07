-- ============================================================================
-- INOVX OPS - MIGRATION 001: PERMISSIONS ENGINE & AUDIT LOGGING
-- Author: Member B (Permissions, Visibility & Audit)
-- Formula: effective_permission(user, key) = role_default + user_grant - user_revoke
-- ============================================================================

-- 1. Create user_permissions table (Per-person Granular Overrides)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references public.users(id)
    permission_key TEXT NOT NULL,
    is_granted BOOLEAN NOT NULL, -- TRUE for explicit grant (+), FALSE for explicit revoke (-)
    granted_by UUID, -- references public.users(id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_permission UNIQUE (user_id, permission_key)
);

-- Index for fast user permission resolution in RLS policies
CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup 
ON public.user_permissions (user_id, permission_key);

-- 2. Create audit_log table (Immutable Security & Changes Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID, -- references public.users(id)
    entity_type TEXT NOT NULL, -- 'user_permissions', 'role', 'board_visibility', etc.
    entity_id TEXT,
    action TEXT NOT NULL, -- 'GRANT', 'REVOKE', 'RESET_ROLE', 'UPDATE_PERMISSIONS', etc.
    diff JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created 
ON public.audit_log (created_at DESC);

-- 3. Core PostgreSQL Resolver Function: effective_permission()
-- Evaluated strictly on the SERVER in PostgreSQL (Never trusts client)
CREATE OR REPLACE FUNCTION public.effective_permission(target_user_id UUID, req_perm TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_override BOOLEAN;
BEGIN
    -- Return false if user is null
    IF target_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Step 1: Check explicit per-person override in user_permissions
    SELECT is_granted INTO v_override
    FROM public.user_permissions
    WHERE user_id = target_user_id AND permission_key = req_perm;

    -- If an explicit override exists, it immediately takes precedence
    IF v_override IS NOT NULL THEN
        RETURN v_override;
    END IF;

    -- Step 2: Fallback to Role Default Template
    SELECT role INTO v_role 
    FROM public.users 
    WHERE id = target_user_id;

    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Template A: Super Admin (Unrestricted authority)
    IF v_role = 'super_admin' THEN
        RETURN TRUE;

    -- Template B: Admin (Domain Leads / Core Managers)
    ELSIF v_role = 'admin' THEN
        RETURN req_perm IN (
            'task.view.all',
            'task.view.domain',
            'task.create',
            'task.edit.all',
            'task.approve',
            'board.view.all',
            'board.view.domain',
            'board.view.committee',
            'board.visibility.manage',
            'recurring.manage',
            'announcement.create',
            'meetings.manage',
            'analytics.view',
            'member.manage'
        );

    -- Template C: Faculty (Read-only oversight & reports)
    ELSIF v_role = 'faculty' THEN
        RETURN req_perm IN (
            'task.view.all',
            'board.view.all',
            'oversight.view'
        );

    -- Template D: Member (Standard club member)
    ELSIF v_role = 'member' THEN
        RETURN req_perm IN (
            'task.create',
            'task.view.domain',
            'board.view.domain',
            'board.view.committee'
        );
    END IF;

    RETURN FALSE;
END;
$$;

-- 4. Fast RLS Policy Helper: has_perm()
-- Reused by all RLS policies to check the currently authenticated caller (auth.uid())
CREATE OR REPLACE FUNCTION public.has_perm(perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.effective_permission(auth.uid(), perm);
$$;

-- 5. RPC Helper for Session Hydration (Used by Member C on login)
-- Returns all active effective permissions for the current user as JSON
CREATE OR REPLACE FUNCTION public.get_my_effective_permissions()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_role TEXT;
    v_perms JSONB;
    v_perm_record RECORD;
    v_allowed BOOLEAN;
    v_result JSONB := '{}'::JSONB;
    v_all_keys TEXT[] := ARRAY[
        'task.view.all', 'task.view.domain', 'task.create', 'task.edit.all', 'task.approve', 'task.delete',
        'board.view.all', 'board.view.domain', 'board.view.committee', 'board.visibility.manage',
        'recurring.manage', 'announcement.create', 'meetings.manage',
        'permissions.manage', 'oversight.view', 'analytics.view', 'member.manage'
    ];
    k TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN '{}'::JSONB;
    END IF;

    FOREACH k IN ARRAY v_all_keys LOOP
        v_allowed := public.effective_permission(v_uid, k);
        v_result := jsonb_set(v_result, ARRAY[k], to_jsonb(v_allowed));
    END LOOP;

    RETURN v_result;
END;
$$;
