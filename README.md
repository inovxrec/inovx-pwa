# InovX Ops — Frontend & Operations Client

Vite, React 19, and TypeScript single-page application for InovX operations. Styled with standard CSS and design tokens (`src/styles/tokens.css`).

---

## Getting Started

### Development

```bash
npm install
npm run dev
```

### Automated Tests

```bash
npm test
```

### Production Build

```bash
npm run build
```

---

## Authentication & Demo Accounts

The application implements a 4-role access model:

| Email | Password | Role | Description |
|---|---|---|---|
| `varun@inovx.club` | `demo` | `super_admin` | President / Core Lead (Full system access) |
| `sanjeev@inovx.club` | `demo` | `admin` | Tech Lead / Domain Lead (Domain & Board management) |
| `faculty@inovx.club` | `demo` | `faculty` | Faculty In-Charge (Read-only oversight) |
| `riya@inovx.club` | `demo` | `member` | Design Lead (Member with delegated `task.approve`) |
| `member@inovx.club` | `demo` | `member` | Standard Member |

---

## Security & Permissions (Stream B)

Authorization is enforced server-side via PostgreSQL Row-Level Security (RLS) and dynamic SQL functions:

```text
effective_permission(user, key) = role_default(user.role, key) + user_grant(user, key) - user_revoke(user, key)
```

- **Database Migrations:** `supabase/migrations/`
- **Client Service & Resolver:** `src/lib/permissions/`
- **Administration UI:** `src/features/permissions/`
- **Technical Specification:** See [`docs/STREAM_B_PERMISSIONS_AND_AUDIT.md`](./docs/STREAM_B_PERMISSIONS_AND_AUDIT.md)

---

## Component Guidelines

1. **Shared Styles & Components:** Do not modify `src/styles/tokens.css`, `src/components/`, or `src/layouts/` without team alignment.
2. **UI Primitives:** Use shared components (`<Button>`, `<Panel>`, `<Pill>`, `<Avatar>`, `<Modal>`).
3. **Session Verification:** Use `can(session, 'permission.key')` from `src/store/authStore.ts` for UI gating.
4. **Responsive Layouts:** Apply `@media (max-width: 720px)` breakpoints in component stylesheets. `AppShell` handles navigation transitions.


