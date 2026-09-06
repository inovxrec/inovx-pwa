# Stream A -> Stream C Contract: CSV Bulk-Import & Account Provisioning

This document outlines the interface contract between **Stream A (Foundation & Integration)** and **Stream C (Accounts & Auth Provisioning)** for the member bulk-import pipeline.

---

## 1. Overview & Architecture

```
[ Frontend: Admin CSV Upload ]
               │
               ▼
[ Edge Function: bulk-import-members (Stream A) ]
               │
               ├─ Validates schema (name, email, domain, role)
               ├─ Generates batch_id UUID
               └─ Inserts valid rows into `pending_imports` (status = 'pending')
               │
               ▼
[ Table: public.pending_imports (Stream A) ]
               │
               ▼
[ Provisioning Worker / Trigger (Stream C) ]
               │
               ├─ Reads rows WHERE status = 'pending'
               ├─ Creates auth.users via Supabase Admin API (temporary password / invite)
               ├─ Inserts public.users with tenure_id, domain_id, must_change_password=true
               └─ Updates pending_imports: status = 'completed' (or 'failed' + error_message)
```

---

## 2. CSV File Specification

The uploaded CSV file must contain a header line and the following columns (case-insensitive headers):

| Header | Required | Permitted Values / Format | Example |
|---|---|---|---|
| `name` | Yes | Non-empty string | `Ananya Rao` |
| `email` | Yes | Valid email matching standard regex | `ananya@inovx.club` |
| `domain` | Yes | `Technical`, `Management`, `Events`, `Media & PR`, `Design` | `Design` |
| `role` | Yes | `member`, `admin`, `super_admin`, `faculty` | `member` |

### Sample CSV File:
```csv
name,email,domain,role
Ananya Rao,ananya@inovx.club,Design,member
Karan Mehta,karan@inovx.club,Events,member
Sanjeev Varma,sanjeev@inovx.club,Technical,member
Dr. Nair,nair@college.edu,Management,faculty
Riya Sharma,riya@inovx.club,Technical,admin
```

---

## 3. Edge Function Endpoint (`bulk-import-members`)

- **Method**: `POST`
- **URL**: `https://<project-ref>.supabase.co/functions/v1/bulk-import-members`
- **Headers**:
  - `Authorization: Bearer <supabase_anon_key or admin_jwt>`
  - `Content-Type: application/json` OR `multipart/form-data` OR `text/csv`

### JSON Request Payload
```json
{
  "tenureId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "rows": [
    {
      "name": "Ananya Rao",
      "email": "ananya@inovx.club",
      "domain": "Design",
      "role": "member"
    }
  ]
}
```

### JSON Response Payload (`200 OK`)
```json
{
  "ok": true,
  "batchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "totalRows": 45,
  "validCount": 43,
  "invalidCount": 2,
  "insertedCount": 43,
  "errors": [
    {
      "rowNumber": 12,
      "raw": { "name": "Test User", "email": "invalid-email", "domain": "Tech", "role": "member" },
      "errors": ["Invalid email format: invalid-email"]
    },
    {
      "rowNumber": 28,
      "raw": { "name": "", "email": "missing@inovx.club", "domain": "Unknown", "role": "lead" },
      "errors": [
        "Name is required",
        "Unrecognized domain: \"Unknown\". Valid options: Technical, Management, Events, Media & PR, Design",
        "Invalid role: \"lead\". Valid roles: member, admin, super_admin, faculty"
      ]
    }
  ]
}
```

---

## 4. `pending_imports` Database Table (Stream C Contract)

Stream A created the staging table `pending_imports`. Stream C should process rows from this table.

### Schema:
```sql
CREATE TABLE pending_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id UUID REFERENCES tenures(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Status Lifecycle:
1. **`pending`**: Inserted by Stream A's Edge Function. Waiting for Stream C's provisioning worker.
2. **`processing`**: Stream C worker marks row as processing while calling `auth.admin.createUser()` or sending invites.
3. **`completed`**: User successfully provisioned in `auth.users` and `public.users`.
4. **`failed`**: Provisioning failed (e.g. email collision in auth, network error). `error_message` is populated.

---

## 5. Stream C Implementation Guidelines

1. **Worker Query**:
   ```ts
   const { data: pendingRows } = await supabase
     .from('pending_imports')
     .select('*')
     .eq('status', 'pending')
     .order('created_at', { ascending: true })
     .limit(50);
   ```

2. **Per-Row Provisioning Flow**:
   - Update `pending_imports` `status = 'processing'`.
   - Create auth user using `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
   - Insert corresponding record into `public.users`:
     ```ts
     await supabase.from('users').insert({
       id: authUser.id,
       tenure_id: row.tenure_id,
       email: row.email,
       name: row.name,
       initials: row.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
       role: row.role as UserRole,
       domain: row.domain,
       status: 'active',
       must_change_password: true,
     });
     ```
   - Mark `pending_imports`:
     `status = 'completed'`, `processed_at = new Date().toISOString()`.
   - On error:
     `status = 'failed'`, `error_message = err.message`.
