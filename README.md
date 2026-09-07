# INOVX84 — Frontend & Operations App

Vite + React 19 + TypeScript single-page application and internal operations system for InovX. No Tailwind — plain CSS files per component using the design tokens in `src/styles/tokens.css`.

---

## 🚀 Quick Start

### 1. Install & Run Development Server

```bash
npm install
npm run dev
```

### 2. Run Test Suite

```bash
npm test
```

### 3. Production Build

```bash
npm run build
```

---

## 👥 Demo Accounts (4 Role Model)

| Email | Password | Role | Description |
|---|---|---|---|
| `varun@inovx.club` | `demo` | `super_admin` | President / Core Leader (Unrestricted authority) |
| `sanjeev@inovx.club` | `demo` | `admin` | Tech Lead / Domain Lead (Domain & Board Management) |
| `faculty@inovx.club` | `demo` | `faculty` | Faculty In-Charge (Read-only club-wide oversight) |
| `riya@inovx.club` | `demo` | `member` | Design Lead (Member with delegated `task.approve`) |
| `member@inovx.club` | `demo` | `member` | Media Coordinator / Standard Member |

---

## 🛡️ Architecture & Streams

### Stream B: Permissions, Visibility & Audit
Stream B implements the server-enforced authorization engine and tri-state granular permissions:
$$\mathbf{Effective\ Permission(user, key)} = \text{Role Default} + \text{User Grant} - \text{User Revoke}$$

* **PostgreSQL Migrations & RLS:** Located in `supabase/migrations/`
* **Frontend Permission Resolver & Service:** Located in `src/lib/permissions/`
* **Admin & Permissions UI:** Located in `src/features/permissions/`
* **Documentation & Integration Guide:** See [`docs/STREAM_B_PERMISSIONS_AND_AUDIT.md`](./docs/STREAM_B_PERMISSIONS_AND_AUDIT.md)

---

## 📐 Rules for Building Screens

1. **Shared Styles & Components:** Don't edit `src/styles/tokens.css`, `src/components/`, or `src/layouts/` without coordinating with the team.
2. **Design System:** Use pre-built shared components from `src/components/` (`<Button>`, `<Panel>`, `<Pill>`, `<Avatar>`, `<Modal>`).
3. **Toasts:** Use `const { toast } = useToast(); toast('ACTION COMPLETED');`.
4. **Permissions Check:** Use `can(session, 'permission.key')` from `src/store/authStore.ts`.
5. **Mobile Responsive:** Use `@media (max-width: 720px)` in per-component CSS — `AppShell` switches nav-rail to bottom-bar automatically.

