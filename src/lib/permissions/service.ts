/**
 * InovX Ops - Permissions Database Service
 * Connects frontend UI to Supabase `user_permissions` and `audit_log` tables.
 */

import { supabase, isSupabaseConfigured } from '../supabase';
import type {
  MemberProfile,
  TriState,
  AuditLogEntry,
} from './types';
import {
  PERMISSION_CATALOGUE,
} from './types';
import { computePermissionDiff } from './resolver';

// Fallback Mock data for development and initial staging
const MOCK_MEMBERS: MemberProfile[] = [
  { id: 'usr_riya', name: 'Riya Sen', email: 'riya@inovx.club', role: 'member', domain: 'design', positionTitle: 'Domain Lead (Design)', initials: 'RS' },
  { id: 'usr_karan', name: 'Karan Mehta', email: 'karan@inovx.club', role: 'member', domain: 'events', positionTitle: 'Domain Lead (Events)', initials: 'KM' },
  { id: 'usr_sanjeev', name: 'Sanjeev Varma', email: 'sanjeev@inovx.club', role: 'admin', domain: 'technical', positionTitle: 'Tech Lead', initials: 'SV' },
  { id: 'usr_ananya', name: 'Ananya Rao', email: 'ananya@inovx.club', role: 'member', domain: 'media', positionTitle: 'Media Coordinator', initials: 'AR' },
  { id: 'usr_varun', name: 'Varun Sharma', email: 'varun@inovx.club', role: 'super_admin', domain: 'core', positionTitle: 'President', initials: 'VS' },
  { id: 'usr_faculty', name: 'Dr. Radhakrishnan', email: 'faculty@rec.ac.in', role: 'faculty', domain: 'core', positionTitle: 'Faculty In-Charge', initials: 'RK' },
];

const localOverrides: Record<string, Record<string, TriState>> = {
  usr_riya: {
    'task.approve': 'grant', // Delegated domain lead approval (FR-TASK-9)
    'task.view.all': 'inherit',
    'recurring.manage': 'inherit',
  },
  usr_karan: {
    'task.approve': 'grant', // Delegated domain lead approval
    'recurring.manage': 'revoke',
  },
};

const localAuditLogs: AuditLogEntry[] = [
  {
    id: 'aud_001',
    actorId: 'usr_varun',
    actorName: 'Varun Sharma (Super Admin)',
    entityType: 'user_permissions',
    entityId: 'usr_riya',
    action: 'GRANT',
    diff: {
      permission: 'task.approve',
      reason: 'Delegated Domain Lead completion approvals (FR-TASK-9)',
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export async function fetchMembersWithPermissions(): Promise<{
  members: MemberProfile[];
  permissionsState: Record<string, Record<string, TriState>>;
}> {
  if (isSupabaseConfigured) {
    try {
      // 1. Fetch Users
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id, name, email, role, domain, position_title')
        .order('name');

      if (usersErr) throw usersErr;

      // 2. Fetch User Permissions Overrides
      const { data: permsData, error: permsErr } = await supabase
        .from('user_permissions')
        .select('user_id, permission_key, is_granted');

      if (permsErr) throw permsErr;

      const members: MemberProfile[] = (usersData || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        domain: u.domain || 'core',
        positionTitle: u.position_title,
        initials: u.name
          ? u.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
          : 'U',
      }));

      const permissionsState: Record<string, Record<string, TriState>> = {};
      for (const m of members) {
        permissionsState[m.id] = {};
        for (const p of PERMISSION_CATALOGUE) {
          permissionsState[m.id][p.key] = 'inherit';
        }
      }

      for (const row of permsData || []) {
        if (permissionsState[row.user_id]) {
          permissionsState[row.user_id][row.permission_key] = row.is_granted ? 'grant' : 'revoke';
        }
      }

      return { members, permissionsState };
    } catch (err) {
      console.warn('Falling back to local permissions state due to:', err);
    }
  }

  // Fallback / Staging mock
  const permissionsState: Record<string, Record<string, TriState>> = {};
  for (const m of MOCK_MEMBERS) {
    permissionsState[m.id] = {};
    for (const p of PERMISSION_CATALOGUE) {
      permissionsState[m.id][p.key] = localOverrides[m.id]?.[p.key] || 'inherit';
    }
  }

  return {
    members: MOCK_MEMBERS,
    permissionsState,
  };
}

export async function saveUserPermissions(
  targetUserId: string,
  overrides: Record<string, TriState>,
  actorId: string,
  actorName: string,
  userRole?: string
): Promise<{ success: boolean; error?: string }> {
  // For audit trail, prefer explicit userRole parameter or fetch from Supabase
  let computedRole = userRole;

  if (!computedRole && isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', targetUserId)
        .single();
      if (data?.role) {
        computedRole = data.role;
      }
    } catch (err) {
      console.warn('Could not fetch user role from Supabase:', err);
    }
  }

  // Fallback to MOCK_MEMBERS only if no Supabase access or user not found
  if (!computedRole) {
    const member = MOCK_MEMBERS.find((m) => m.id === targetUserId);
    computedRole = member?.role;
  }

  const diff = computedRole ? computePermissionDiff(computedRole as any, overrides) : { granted: [], revoked: [], inherited: [] };

  if (isSupabaseConfigured) {
    try {
      // 1. Delete existing overrides for this user
      const { error: delErr } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', targetUserId);

      if (delErr) throw delErr;

      // 2. Prepare new rows for non-inherit overrides
      const rowsToInsert: { user_id: string; permission_key: string; is_granted: boolean; granted_by: string }[] = [];
      for (const [key, state] of Object.entries(overrides)) {
        if (state === 'grant') {
          rowsToInsert.push({
            user_id: targetUserId,
            permission_key: key,
            is_granted: true,
            granted_by: actorId,
          });
        } else if (state === 'revoke') {
          rowsToInsert.push({
            user_id: targetUserId,
            permission_key: key,
            is_granted: false,
            granted_by: actorId,
          });
        }
      }

      if (rowsToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('user_permissions')
          .insert(rowsToInsert);

        if (insErr) throw insErr;
      }

      // 3. Write to Audit Log (FR-ROLE-3)
      await supabase.from('audit_log').insert({
        actor_id: actorId,
        entity_type: 'user_permissions',
        entity_id: targetUserId,
        action: 'UPDATE_PERMISSIONS',
        diff,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error saving user permissions to Supabase:', err);
      return { success: false, error: err.message || 'Database mutation failed' };
    }
  }

  // Local state update
  localOverrides[targetUserId] = { ...overrides };
  localAuditLogs.unshift({
    id: `aud_${Date.now()}`,
    actorId,
    actorName,
    entityType: 'user_permissions',
    entityId: targetUserId,
    action: 'UPDATE_PERMISSIONS',
    diff: diff || {},
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Resets a member's custom permissions back to their base role defaults (FR-ROLE-4).
 * Removes all overrides from `user_permissions` and records a `RESET_ROLE` entry in `audit_log`.
 *
 * @param targetUserId The UUID or ID of the member to reset
 * @param actorId The ID of the admin performing the reset (defaults to 'unknown')
 * @param actorName The display name of the admin (defaults to 'User')
 */
export async function resetUserPermissions(
  targetUserId: string,
  actorId: string = 'unknown',
  actorName: string = 'User'
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { error: delErr } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', targetUserId);

      if (delErr) throw delErr;

      // Log reset in audit_log
      await supabase.from('audit_log').insert({
        actor_id: actorId,
        entity_type: 'user_permissions',
        entity_id: targetUserId,
        action: 'RESET_ROLE',
        diff: { resetToDefault: true },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reset permissions' };
    }
  }

  // Local state update
  delete localOverrides[targetUserId];
  localAuditLogs.unshift({
    id: `aud_${Date.now()}`,
    actorId,
    actorName,
    entityType: 'user_permissions',
    entityId: targetUserId,
    action: 'RESET_ROLE',
    diff: { resetToDefault: true },
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}

export async function fetchAuditLogs(limit: number = 20): Promise<AuditLogEntry[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, actor_id, entity_type, entity_id, action, diff, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        actorId: row.actor_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        diff: row.diff,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('Falling back to local audit logs:', err);
    }
  }

  return localAuditLogs.slice(0, limit);
}
