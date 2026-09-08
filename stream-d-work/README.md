# Stream D — work to push

Everything below was built/verified against a local, non-git checkout of what
should be the `inovx-pwa-integration` state (real repo:
`https://github.com/inovxrec/inovx-pwa.git`, no `stream-d` branch exists yet —
every other stream has one). Paths mirror the real repo exactly — copy each
file into your own clone at the same relative path.

## How to apply

```bash
git clone https://github.com/inovxrec/inovx-pwa.git
cd inovx-pwa
git checkout integration            # or Foundation-&-integration — confirm which is current
git checkout -b stream-d/tasks-board

# copy every file from this folder into the same relative path in the clone, e.g.:
cp -r <this-folder>/src/* ./src/

npm install
npm run build   # should be clean
npm run lint    # should be clean (only pre-existing Fast-Refresh warnings)

git add src/lib/linkProvider.ts src/lib/taskTransitions.ts src/lib/adaptTask.ts \
        src/lib/pendingMutations.ts src/store/taskStore.tsx src/store/AuthProvider.tsx \
        src/features/board/Board.tsx src/features/task-detail/TaskDetail.tsx \
        src/components/Pill.tsx src/components/Pill.css src/styles/tokens.css
git commit -m "Stream D: wire live-read task path against real schema"
git push -u origin stream-d/tasks-board
```

**Do not copy/commit `.env.local`** — RUNBOOK.md's own Zero-Leak Policy says never
to commit it. You'll need to create your own from `.env.example` (same repo).

## New files (src/lib/)

- `linkProvider.ts` — FR-LINK-2 provider detection, pure/no dependencies.
- `taskTransitions.ts` — the todo→progress→review→done state machine + `canTransition()`. Header comment flags that the real `tasks.status` CHECK constraint doesn't include `'cancelled'` yet.
- `adaptTask.ts` — maps a Supabase `tasks` row (+ resolved domain/committee, assignees, links) onto the frontend `Task` shape. Reconciled against the REAL schema in `supabase/migrations/20260907000000_foundation_schema.sql` — see header comment for exact column mapping and the domain/committee resolution contract.
- `pendingMutations.ts` — optimistic-write echo-suppression helper. Built but **not wired in anywhere yet** — no write currently succeeds (see below), so there's nothing for it to suppress. Wire it into the Realtime handler once writes actually work.

## Modified files

- `src/store/taskStore.tsx` — re-added `'cancelled'` status, `TaskLink` type, `requestChanges()`, `addLink()`. Added the real `USE_LIVE_TASKS` flag (`import.meta.env.VITE_FEATURE_LIVE_TASKS === 'true'`): when on, reads `tasks`/`task_assignees`/`task_links` from Supabase, subscribes to Realtime on `tasks`, exposes `tasksLoading`/`tasksError`, and every mutator attempts a real write and toasts `SAVE FAILED — ...` on error instead of silently no-opping. When off, mock behavior is byte-for-byte unchanged (verified).
- `src/features/board/Board.tsx`, `src/features/task-detail/TaskDetail.tsx` — minimal loading/error UI wired to `tasksLoading`/`tasksError`, reusing the existing `.empty`/`.l1` CSS pattern (no new styles).
- `src/store/AuthProvider.tsx` — one-line comment: real Supabase Auth is blocked pending Stream C provisioning `auth.users`.
- `src/components/Pill.tsx`/`Pill.css`, `src/styles/tokens.css` — **shared files**, touched additively only (added `'cancelled'` to `Pill`'s status union + one new `--st-cancelled` token). Required for `'cancelled'` to type-check/render at all.

## Before you push — things you need to know

1. **The migration has not actually been applied to the real staging database.** Verified directly: every table in `20260907000000_foundation_schema.sql` (`tasks`, `tenures`, `domains`, `users`, `committees`, `task_activity`, `feature_flags`) returns `PGRST205: Could not find the table 'public.X' in the schema cache` when queried with the real anon key against `ljtreitmsvzseqspiocq.supabase.co`. The read-path code here is correct and fails visibly/gracefully (screenshots available on request) — but nothing will actually show live data until someone runs the migration (RUNBOOK.md §3.3 has the exact steps).
2. **No `task_activity` insert trigger exists** — task mutations won't produce an activity trail even once writes work.
3. **`tasks` RLS write policy is `USING (FALSE)` for everyone** (Stream A placeholder, pending Stream B's real policies) — every write attempt is expected to fail until that lands.
4. **No real `auth.users`** — `seed.sql` only populates `public.users`; nobody can sign in via real Supabase Auth yet. Login stays on the existing fake `AuthProvider`.
