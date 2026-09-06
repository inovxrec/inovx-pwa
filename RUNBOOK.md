# InovX Ops — Foundation & Integration Runbook

**InovX Ops** is an internal task and operations Progressive Web App (PWA) built for the ~45-person college club InovX.
This runbook covers local setup, Supabase environment linking, database migrations, seeding, feature flags, CSV bulk-import contracts, deployment, and rollback procedures.

---

## 1. Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x+` (LTS recommended; tested on `v24.x`)
- **npm**: `v10.x+`
- **Docker**: (Required only if running local Supabase emulator)
- **Supabase CLI**: Accessible via `npx supabase` or global install

### Setup from Scratch
```bash
# 1. Clone repository
git clone https://github.com/inovxrec/inovx-pwa.git
cd inovx-pwa

# 2. Check out working branch
git checkout Foundation-&-integration

# 3. Install dependencies
npm install

# 4. Configure local environment
cp .env.example .env.local

# 5. Verify build & lint
npm run lint
npm run build

# 6. Start local dev server
npm run dev
```
The application will launch at `http://localhost:5173`.

---

## 2. Environment Variables & Security Guardrails

The application requires two frontend variables to connect to Supabase:

| Variable | Staging Default Value | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://ljtreitmsvzseqspiocq.supabase.co` | Supabase API endpoint |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_4n4BGSnpQV_70Nc7IEWK9Q_VlJ5vXqP` | Client anon/publishable key |

> [!CAUTION]
> **Zero-Leak Policy**:
> - **NEVER** commit `.env.local` or any secrets to Git.
> - **NEVER** hardcode the `service_role` key or database password in any client-side file.
> - Client-side calls (`src/lib/supabaseClient.ts`) strictly use the **anon/publishable key**; Postgres Row-Level Security (RLS) protects all data access.

---

## 3. Database Migrations Workflow

All schema definitions live under `supabase/migrations/` as timestamped SQL files.

### 3.1 Local Development (Using Local Supabase)
```bash
# Start local Supabase Postgres, Auth, and Storage emulator (requires Docker)
npx supabase start

# Apply all migrations and execute seed data locally
npx supabase db reset
```

### 3.2 Creating a New Migration
When creating a schema modification:
```bash
npx supabase migration new add_feature_table
```
This generates a new SQL file under `supabase/migrations/<timestamp>_add_feature_table.sql`. Write standard PostgreSQL DDL statements inside.

### 3.3 Applying Migrations to Remote Staging Project
The remote staging project is `ljtreitmsvzseqspiocq`.

1. Authenticate Supabase CLI interactively (one-time setup per machine):
   ```bash
   npx supabase login
   ```
2. Link the repository to the staging project:
   ```bash
   npx supabase link --project-ref ljtreitmsvzseqspiocq
   ```
   *(Enter your database password when prompted)*
3. Push pending migrations to staging:
   ```bash
   npx supabase db push
   ```

#### Alternative (Web Dashboard)
If you do not have the database password locally:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/ljtreitmsvzseqspiocq).
2. Navigate to **SQL Editor**.
3. Copy and paste the contents of `supabase/migrations/20260907000000_foundation_schema.sql` and click **Run**.

---

## 4. Seeding the Database

The initial seed script is located at `supabase/seed.sql`. It establishes:
1. Active Academic Tenure: `2026-2027`
2. Five Official Domains: `Technical`, `Management`, `Events`, `Media & PR`, `Design` (+ `Core Ops`)
3. Four User Roles: `member`, `admin`, `super_admin`, `faculty`
4. Sample Committees: `Techfest 2026`, `Occasion Engine`
5. Sample Tasks with checklists, assignees, and polymorphic context
6. Initial Feature Flags (with Tier-4 features disabled)

### Running Seed Locally
```bash
npx supabase db reset
```

### Running Seed on Staging
Execute the contents of `supabase/seed.sql` in the [Supabase SQL Editor](https://supabase.com/dashboard/project/ljtreitmsvzseqspiocq/sql) on staging.

---

## 5. Feature Flags (Shipping Dark)

The project uses a database-driven feature flag system backed by the `feature_flags` table and the `useFeatureFlag` React hook (`src/hooks/useFeatureFlag.ts`).

### Usage in Components
```tsx
import { useFeatureFlag } from '../hooks/useFeatureFlag';

export function MyComponent() {
  const { isEnabled, loading } = useFeatureFlag('dark_mode_theme');

  if (loading) return null;
  if (!isEnabled) return null; // Shipped dark!

  return <DarkModePalette />;
}
```

### Enabling a Flag in Staging
To enable a Tier-4 feature for testing in staging:
```sql
UPDATE feature_flags
SET is_enabled = TRUE
WHERE key = 'dark_mode_theme';
```
Because the hook listens to Supabase Realtime changes, the UI updates automatically without a page reload.

---

## 6. CSV Bulk-Import Pipeline

- **Edge Function**: `supabase/functions/bulk-import-members/index.ts`
- **Contract Specification**: [`docs/CSV_IMPORT_CONTRACT.md`](docs/CSV_IMPORT_CONTRACT.md)
- **Client Helper**: `src/lib/csvImport.ts`

### Expected CSV Format
```csv
name,email,domain,role
Ananya Rao,ananya@inovx.club,Design,member
Karan Mehta,karan@inovx.club,Events,member
Dr. Nair,nair@college.edu,Management,faculty
Riya Sharma,riya@inovx.club,Technical,admin
```

### Pipeline Flow
1. Admin uploads CSV on the frontend.
2. `submitBulkImport()` calls `bulk-import-members` Edge Function.
3. Edge Function validates fields and inserts rows into `pending_imports` table with a `batch_id`.
4. Stream C's provisioning worker polls `pending_imports` where `status = 'pending'`, creates auth accounts, and updates status to `completed` or `failed`.

---

## 7. Continuous Integration & Deployment (CI/CD)

The repository includes three automated GitHub Actions workflows under `.github/workflows/`:

1. **`ci.yml`**:
   - Runs on every Pull Request to `main`, `integration`, and `Foundation-&-integration`.
   - Executes `npm ci`, `npm run lint` (oxlint), and `npm run build` (TypeScript check + Vite production build).
2. **`deploy-staging.yml`**:
   - Triggers on push / merge to `integration`.
   - Builds the frontend with staging secrets and deploys to the staging URL.
3. **`db-migrate-staging.yml`**:
   - Triggers on push to `integration` when files under `supabase/migrations/**` change.
   - Runs `supabase db push` against staging using encrypted repository secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`).

---

## 8. Migration Rollback Procedure

When a migration causes issues, **never edit an already-applied migration file**. Instead, follow one of two strategies:

### Strategy A: Fix-Forward Migration (Recommended)
Create a new migration file that reverts or corrects the schema:
```bash
npx supabase migration new revert_broken_change
```
Add the compensatory SQL (e.g. `DROP TABLE ...;` or `ALTER TABLE ... DROP COLUMN ...;`), commit, and push through CI.

### Strategy B: Direct Emergency Rollback
If an emergency rollback is required directly on staging:
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/ljtreitmsvzseqspiocq/sql).
2. Run the specific reversal DDL statements.
3. Delete the migration record from `supabase_migrations.schema_migrations` so the migration history remains consistent:
   ```sql
   DELETE FROM supabase_migrations.schema_migrations
   WHERE version = '20260907000000'; -- Replace with the bad migration timestamp
   ```

---

## 9. Stream Ownership Hand-off Contracts

| Stream | Area | Stream A Foundation Delivered | Hand-off Note |
|---|---|---|---|
| **Stream B** | Permissions & RLS | RLS enabled on all 23 tables with placeholder policies; `user_permissions` table created. | Stream B owns `effective_permission()` and will replace the placeholder policies. |
| **Stream C** | Accounts & Auth | `users` table created; `pending_imports` table and `bulk-import-members` Edge Function ready; documented contract. | Stream C implements auth login wiring and the worker consuming `pending_imports`. |
| **Stream D** | Tasks & Board | `tasks`, `task_assignees`, `task_checklist`, `task_activity`, `task_comments`, `task_links`, `recurring_rules` created with polymorphic context. | `task_activity` is protected by an immutability trigger (insert-only). |
| **Stream E** | Command & Oversight Decks | `meetings`, `attendance`, `announcements`, `audit_log`, and `domainMetrics` schema ready. | Tables have indexes on `tenure_id` and context for high performance. |
| **Stream F** | People & Directory | `member_directory` table created (can hold members without auth accounts). | Separate from `users` table. |

> [!IMPORTANT]
> **Frontend Role Change Required**:
> The database schema and `src/types/db.ts` support **4 roles**: `'member' | 'admin' | 'super_admin' | 'faculty'`.
> The existing frontend type in `src/layouts/navConfig.ts` only defines 3 (`'member' | 'admin' | 'faculty'`). The UI owner must update `src/layouts/navConfig.ts` to support `'super_admin'`.
