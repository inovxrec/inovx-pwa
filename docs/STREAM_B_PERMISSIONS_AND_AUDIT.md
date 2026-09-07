# 🛡️ InovX Ops — Stream B: Permissions, Visibility & Audit Engine

> **Owner:** Member B  
> **Classification:** Critical Path Stream (§05, §06, FR-ROLE-1…4, FR-TASK-9)  
> **Status:** ✅ Complete, Fully Tested, and Ready for Integration  

---

## 📌 Executive Summary

Stream B delivers the server-side authorization architecture, database Row-Level Security (RLS) policies, immutable audit logging, and administrative permissions management for **InovX Ops**.

### 🔑 The Core Formula
The entire permission system is evaluated dynamically in PostgreSQL via `SECURITY DEFINER` functions:

$$\mathbf{Effective\ Permission(user, key)} = \text{Role Default} + \text{User Grant} - \text{User Revoke}$$

* **Server-Enforced (Non-Negotiable):** Security is enforced in PostgreSQL RLS. Tampering with client requests or calling the DB directly will still hit a hard authorization wall.
* **Tri-State Model:** Every capability is modeled as `Grant` (+), `Revoke` (-), or `Inherit` (Role default).
* **Approval Bottleneck Solution (FR-TASK-9):** Domain Leads are plain `member` roles by default. Super Admins use Stream B to grant `task.approve` authority directly to Domain Leads without changing their base role, preventing leadership review bottlenecks.

---

## 🗄️ Database Architecture & Migrations

All migrations are located in `supabase/migrations/`:

### 1. `20260906000001_permissions_and_audit.sql`
* **`public.user_permissions` Table:**
  * Stores per-person granular overrides `(user_id, permission_key, is_granted, granted_by, created_at, updated_at)`.
  * Unique constraint on `(user_id, permission_key)`.
* **`public.audit_log` Table:**
  * Immutable record of all permission changes, role assignments, and sensitive actions `(actor_id, entity_type, entity_id, action, diff, created_at)`.
* **`public.effective_permission(target_user_id UUID, req_perm TEXT)`:**
  * Core PostgreSQL SQL function implementing the tri-state formula.
* **`public.has_perm(perm TEXT)`:**
  * Fast helper function checking `effective_permission(auth.uid(), perm)` across all RLS policies.
* **`public.get_my_effective_permissions()`:**
  * RPC function called by Stream C during login to hydrate permissions into the client `Session`.

### 2. `20260906000002_row_level_security_policies.sql`
Comprehensive Row-Level Security policies covering all tables:
* **`tasks` & Sub-tables:**
  * **Read:** Allowed for task creators, assignees, domain members, committee members, club-visible boards, or holders of `task.view.all`.
  * **Insert:** Gated by `task.create`.
  * **Update:** Gated by `task.edit.all`, assignees, or Domain Leads with `task.approve` for review transitions.
  * **Delete:** Gated by `task.delete`.
* **`domains` & `committees`:**
  * Enforces board privacy levels (`private`, `club_visible`, `shared_with`).
* **`user_permissions` & `audit_log`:**
  * Only Super Admins / Permission Managers can mutate overrides; users can read their own.

### 3. `20260906000003_seed_and_stubs.sql`
* Seeds initial test users across all 4 roles (`super_admin`, `admin`, `faculty`, `member`).
* Seeds delegated approvals for Domain Leads (Riya & Karan) and initial audit log entries.

---

## 💻 Frontend Client Architecture

Located in `src/lib/permissions/`:

```
src/lib/permissions/
├── types.ts          ← Canonical PermissionKey catalogue, AppRole, TriState, and Audit types
├── resolver.ts       ← Functional resolution logic, diff calculator, and live preview formatter
├── service.ts        ← Supabase database client wrapper with offline mock fallback
├── index.ts          ← Unified export module
└── __tests__/        ← Automated unit test suite (12 test cases)
```

### 🖥️ Admin UI (`src/features/permissions/Permissions.tsx`)
* **Member Directory:** Real-time search and selection with role & domain indicators.
* **Granular Tri-State Matrix:** Categorized permission controls (`Grant` / `Inherit` / `Revoke`).
* **Live Effective Preview (FR-ROLE-2):** Dynamic display showing exact active capabilities:  
  `> RIYA WILL BE ABLE TO: APPROVE COMPLETIONS · VIEW ALL BOARDS · MANAGE RECURRING RULES`
* **One-Click Reset (FR-ROLE-4):** Wipes custom overrides back to base role defaults.
* **Audit Trail Integration (FR-ROLE-3):** Records diffs on save and includes an in-app audit history inspector.

---

## 🤝 Teammate Integration Guide

### For Member C (Auth & Session):
Import `can` from `src/store/authStore.ts` or call `get_my_effective_permissions()` RPC on login:
```typescript
import { useAuth, can } from '../store/authStore';

const { session } = useAuth();
if (can(session, 'task.approve')) {
  // Show approval actions
}
```

### For Member D (Tasks & Boards):
Query Supabase directly without manual security filtering:
```typescript
// PostgreSQL RLS automatically filters results to permitted tasks only!
const { data: tasks, error } = await supabase.from('tasks').select('*');
```

---

## 🧪 Verification & Testing

Run the automated test suite:
```bash
npm test
```

### Test Coverage Summary:
- ✅ Base Role Default Templates (`super_admin`, `admin`, `faculty`, `member`)
- ✅ Tri-State Overrides (Grant precedence, Revoke precedence, Inherit fallback)
- ✅ Delegated Domain Lead Approval (`task.approve` on `member`)
- ✅ Live Dynamic Effective Preview (FR-ROLE-2)
- ✅ Permission Diff & Audit Trail Generation (FR-ROLE-3)
- ✅ Clean TypeScript compilation with 0 errors (`npm run build`)
