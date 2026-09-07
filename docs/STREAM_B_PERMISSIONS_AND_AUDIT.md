# Stream B: Permissions, Visibility & Audit Engine

- **Owner:** Member B
- **Module:** Security & Authorization Layer (§05, §06, FR-ROLE-1..4, FR-TASK-9)
- **Status:** Complete, Tested, Integrated

---

## 1. Overview

Stream B implements the server-enforced authorization architecture, Row-Level Security (RLS) policies, immutable audit logging, and administrative access management for InovX Ops.

### Resolution Model

Authorization is computed dynamically in PostgreSQL using `SECURITY DEFINER` functions:

```text
effective_permission(user, key) = role_default(user.role, key) + user_grant(user, key) - user_revoke(user, key)
```

- **Server-Enforced:** All data operations are constrained via PostgreSQL Row-Level Security (RLS). Direct database access or modified API clients cannot bypass policy checks.
- **Tri-State Semantics:** Explicit `grant` (override true), explicit `revoke` (override false), or `inherit` (fallback to role template).
- **Delegated Approval (FR-TASK-9):** Domain leads hold a base `member` role while receiving explicit `task.approve` authority, avoiding leadership bottlenecks without privilege escalation.

---

## 2. Database Schema & Migrations

All migrations reside in `supabase/migrations/`:

### `20260906000001_permissions_and_audit.sql`
- `public.user_permissions`: Stores per-user overrides `(user_id, permission_key, is_granted, granted_by, created_at, updated_at)` with a unique constraint on `(user_id, permission_key)`.
- `public.audit_log`: Append-only audit trail recording `(actor_id, entity_type, entity_id, action, diff, created_at)`.
- `public.effective_permission(target_user_id UUID, req_perm TEXT) -> BOOLEAN`: Core PL/pgSQL resolution function.
- `public.has_perm(perm TEXT) -> BOOLEAN`: Fast evaluation helper for RLS policies against `auth.uid()`.
- `public.get_my_effective_permissions() -> JSONB`: Session hydration RPC endpoint called upon login.

### `20260906000002_row_level_security_policies.sql`
Row-Level Security policies applied across all tables:
- `tasks`: Read access for assignees, creators, domain/committee members, and holders of `task.view.all`. Write access guarded by `task.create`, `task.edit.all`, and delegated `task.approve`.
- `domains` & `committees`: Read access gated by board visibility (`private`, `club_visible`, `shared_with`) and domain membership.
- `user_permissions` & `audit_log`: Restricted to super admins and permission managers (`permissions.manage`).

### `20260906000003_seed_and_stubs.sql`
- Initial test fixtures across all 4 roles (`super_admin`, `admin`, `faculty`, `member`).
- Seeded delegated approval records for domain leads (`task.approve` for Riya and Karan).

---

## 3. Client Architecture

Source code located in `src/lib/permissions/`:

```text
src/lib/permissions/
├── types.ts          # Canonical PermissionKey definitions, AppRole, and TriState types
├── resolver.ts       # Pure resolution logic, diff calculation, and preview formatting
├── service.ts        # Supabase client wrapper with fallback mock and audit integration
├── index.ts          # Module export barrel
└── __tests__/        # Automated test suite (16 test cases)
```

### Admin UI (`src/features/permissions/Permissions.tsx`)
- **Directory Selector:** Filter members by name, email, role, or domain.
- **Tri-State Controls:** Categorized permission matrix with instant state updates.
- **Effective Preview (FR-ROLE-2):** Real-time text preview displaying computed permissions for the selected member.
- **Role Reset (FR-ROLE-4):** Wipes custom overrides back to base role defaults.
- **Audit Viewer (FR-ROLE-3):** Historical audit log table displaying timestamp, actor, action, and diff payload.

---

## 4. Integration Guide

### Authentication & Session (Stream C)
Import `can` from `src/store/authStore.ts` or hydrate permissions from `get_my_effective_permissions()`:

```typescript
import { useAuth, can } from '../store/authStore';

const { session } = useAuth();
if (can(session, 'task.approve')) {
  // Render approval workflow actions
}
```

### Tasks & Boards (Stream D)
Query Supabase directly. PostgreSQL RLS automatically enforces visibility and permissions:

```typescript
const { data: tasks, error } = await supabase
  .from('tasks')
  .select('*');
```

---

## 5. Verification & Testing

Run unit tests and type checks:

```bash
npm test
npm run build
```

### Test Scenarios Covered
1. Base role default templates (`super_admin`, `admin`, `faculty`, `member`)
2. Tri-state override precedence (Grant overrules default, Revoke denies default)
3. Delegated domain lead approval (`task.approve` on `member`)
4. Dynamic live effective preview text formatting (FR-ROLE-2)
5. Permission diff computation for audit log records (FR-ROLE-3)
6. Synchronous `can()` session helper verification

