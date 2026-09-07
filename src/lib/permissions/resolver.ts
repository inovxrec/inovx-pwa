/**
 * InovX Ops - Permission Resolver Engine
 * Implements: effective_permission(user, key) = role_default(user.role, key) + user_grant(user, key) - user_revoke(user, key)
 */

import type {
  AppRole,
  PermissionKey,
  TriState,
  PermissionDiff,
} from './types';
import {
  ROLE_DEFAULT_PERMISSIONS,
  PERMISSION_CATALOGUE,
} from './types';

/**
 * Resolves a single effective permission for a user given their role and custom overrides.
 */
export function resolveEffectivePermission(
  role: AppRole,
  overrides: Record<string, TriState> | undefined,
  permKey: PermissionKey
): boolean {
  // 1. Super Admin is always allowed everything
  if (role === 'super_admin') {
    if (overrides && overrides[permKey] === 'revoke') {
      return false;
    }
    return true;
  }

  // 2. Check explicit user override
  const overrideState = overrides ? overrides[permKey] : undefined;
  if (overrideState === 'grant') {
    return true;
  }
  if (overrideState === 'revoke') {
    return false;
  }

  // 3. Fallback to Role Default (Inherit)
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return defaults.includes(permKey);
}

/**
 * Returns the complete list of active permissions for a user.
 */
export function getEffectivePermissionList(
  role: AppRole,
  overrides: Record<string, TriState> | undefined
): PermissionKey[] {
  const result: PermissionKey[] = [];
  for (const item of PERMISSION_CATALOGUE) {
    if (resolveEffectivePermission(role, overrides, item.key)) {
      result.push(item.key);
    }
  }
  return result;
}

/**
 * Formats the live preview text (FR-ROLE-2)
 * Example: "APPROVE COMPLETIONS · VIEW ALL BOARDS · MANAGE RECURRING RULES"
 */
export function formatEffectivePreview(
  role: AppRole,
  overrides: Record<string, TriState> | undefined
): string {
  const activeKeys = getEffectivePermissionList(role, overrides);
  if (activeKeys.length === 0) {
    return 'NO ACTIVE PERMISSIONS';
  }

  const labels = activeKeys
    .map((k) => PERMISSION_CATALOGUE.find((p) => p.key === k)?.label)
    .filter((label): label is string => Boolean(label));

  return labels.join(' · ').toUpperCase();
}

/**
 * Computes difference between base role defaults and current tri-state overrides
 */
export function computePermissionDiff(
  role: AppRole,
  currentOverrides: Record<string, TriState>
): PermissionDiff {
  const defaults = new Set(ROLE_DEFAULT_PERMISSIONS[role] || []);
  const granted: PermissionKey[] = [];
  const revoked: PermissionKey[] = [];
  const inherited: PermissionKey[] = [];

  for (const item of PERMISSION_CATALOGUE) {
    const state = currentOverrides[item.key] || 'inherit';
    if (state === 'grant') {
      if (!defaults.has(item.key)) {
        granted.push(item.key);
      }
    } else if (state === 'revoke') {
      if (defaults.has(item.key)) {
        revoked.push(item.key);
      }
    } else {
      inherited.push(item.key);
    }
  }

  return { granted, revoked, inherited };
}
