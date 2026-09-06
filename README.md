# INOVX Ops — Frontend

Vite + React + TypeScript. No Tailwind — plain CSS files per component, every
value read from the tokens in `src/styles/tokens.css`.

`INOVX-FRONTEND-BUILD-PROMPT.md` governs everything visual and interactive.
Where anything here disagrees with it, that document wins.

## Run it

```
npm install
npm run dev
```

The app opens at `/login`. Auth is still faked in `AuthProvider`, so any of
these work — all with the password `demo`:

| Email | Role |
|---|---|
| riya@inovx.club | super-admin |
| arjun@inovx.club | admin |
| member@inovx.club | member |
| faculty@inovx.club | faculty |

Every account still holds its issued password, so the first sign-in goes
through `/first-run` and then the tour, exactly as §9.2 requires. Those two
are remembered per email in `localStorage` under `inovx.dev.entry` — clear
that key to replay the flow.

**/kitchen-sink** holds the Phase 1 review surface and a role switcher that
jumps straight into the shell.

`member@inovx.club` is the account with real work on it — the other three own
few or no tasks, so their My Day is mostly the empty state.

## Where the build is

**Phases 1 to 5 of the §13 build order are done. Phase 5 stops here for review.**

| | |
|---|---|
| ✅ Tokens | `src/styles/tokens.css` — §3 verbatim, plus the §5.4 density scale and a `--scrim` token §7.14 needed but §3 omitted |
| ✅ Base styles | `src/styles/base.css` — reset, the §4.1 type scale, surfaces, focus ring, reduced motion |
| ✅ Fonts | Anton · Inter · Instrument Serif, loaded in `index.html` |
| ✅ Signature | `src/ui/signature/` — BrushStroke, Tape, Pin, Halftone |
| ✅ Stickers | `src/ui/stickers/` — all nine from §6.2 |
| ✅ Primitives | `src/ui/primitives/` — the full §12 list, every variant and all six states |
| ✅ Kitchen sink | `/kitchen-sink`, on both a paper and an ink ground |
| ✅ Nav chrome | `src/ui/nav/` — NavRail, BottomBar, Header, MoreSheet, AppShell |
| ✅ Page transitions | 200ms fade + 8px rise, no horizontal slide (§10) |
| ✅ Offline banner | `src/ui/nav/OfflineBanner.tsx` — §9.18 copy verbatim |
| ✅ System screens | 404 · 403 · 500 in `src/screens/system/` |
| ✅ Routing | Role-based landing redirect + permission gates (§9.4–9.6) |
| ✅ Login | `/login` — §9.1, one error for both halves, lockout after five tries |
| ✅ First run | `/first-run` — §9.2, live checklist, unavoidable until done |
| ✅ Onboarding | `/welcome` — §9.3, four slides, swipe on mobile, arrows on desktop |
| ✅ Install card | `src/ui/patterns/InstallCard.tsx` — §9.16, iOS / Android / desktop |
| ✅ My Day | `/my-day` — §9.4, swipe to advance with undo, long-press for the state sheet |
| ✅ Board | `/board/:slug` — §9.7, Kanban with drag and drop on desktop, grouped list on mobile |
| ✅ Task detail | §9.8 — a 480px drawer on desktop, a full-screen route on mobile |
| ✅ TaskCard | §7.10 — full and compact, overdue, cancelled, drag, realtime flash |
| ✅ Command Deck | `/deck` — §9.5, stat row, domain strips, approval queue, attention list |
| ✅ Oversight Deck | `/oversight` — §9.6, read-only, prose summary, DataView table |
| ✅ Insights | `/insights` — §9.12, charts and the permission-gated leaderboard |
| ✅ Charts | `src/ui/charts/` — line, bars and sparkline, all inline SVG |
| ⬜ Phase 6 onward | Calendar, People, Meetings, Notifications, Settings — not started |

Every nav destination routes to a placeholder naming the phase and spec section
that delivers it. Those are deleted as their real screens land.

### Roles and landing screens

| Role | Lands on | Nav |
|---|---|---|
| member | `/my-day` | no Deck, Insights or Admin |
| admin | `/deck` | adds Deck, Insights, approvals |
| super-admin | `/deck` | everything, including Admin |
| faculty | `/oversight` | read-only; no My Day, no Admin |

Permission-gated destinations are **absent from the nav**, not disabled (§14
item 13). Hitting one directly renders the 403 screen.

The previous INOVX84 CRT/terminal build was withdrawn by §0 and removed. It is
still in git history if you need to look something up.

## Open questions

0. **Phase 2 asks for "the four system screens" but §9.18 specifies three**
   (404, 403, 500) plus the offline banner and an update toast. The three are
   built. Say what the fourth should be if one is missing.
1. **The logo.** §2 expects `public/brand/inovx-logo.png`; it isn't in the repo.
   `src/ui/brand/Logo.tsx` renders it everywhere and falls back to the word set
   in Anton until it lands, so dropping the file in is the whole fix. The PWA
   icons §2 asks to generate from it are still outstanding, and belong with
   Phase 8's manifest work.
2. **The brush at wide sizes.** The §6.1 paths stretch with
   `preserveAspectRatio="none"`, so a full-width button flattens into a smooth
   lozenge rather than reading as hand-painted. Worth a look on
   `/kitchen-sink` before it ends up under every primary action.
3. **"Forgot password" has no destination.** §9.1 asks for the control but
   names no screen, and §15 says not to invent one. It currently reveals a line
   saying to ask a core team member, since accounts are issued by hand. Say if
   a real reset flow is wanted.
4. **Two decorations on My Day.** §9.4 asks for tape on the overdue card *and*
   a pin on the announcement, but §6.3 caps a screen at one of the two. The
   tape goes to the overdue block when there is one, otherwise the pin marks
   the announcement. Say which you would rather have.
5. **The compact task card shows a state word, not just a dot.** §7.10 says
   dot alone; §14 item 11 rules out colour-only information. The word rides
   with the dot.
6. **Red bars.** A domain or member with an overdue task draws its bar in
   `--st-blocked` instead of its domain colour. The value label always says
   "· N late" alongside, so the colour is never the only signal — but say if
   you would rather the bar always kept its domain colour.
7. **The 404 button label.** §9.18 fixes it as "BACK TO MY DAY", but faculty
   have no My Day screen, so it now names whichever landing it actually goes
   to. Flagged in `SystemScreens.tsx`; easy to revert to the literal copy.

## Temporary scaffolding

`AuthProvider` fakes `login` against a hardcoded table and remembers the entry
flags in `localStorage`; `setRole` and the `/kitchen-sink` switcher jump into
the shell as another role without signing out. All of it is marked `TEMP` and
goes when `/api/auth/login` lands — the `Session` shape should not need to
change.

## About the charts

`src/lib/analytics.ts` derives everything it can from the task list, so the
decks and the board can never disagree; only history the store does not keep
(twelve weeks of completions, attendance, minutes) is seeded.

**The domain channel palette fails as a series palette.** Run through the
standard six checks against `--paper`, the five `--dom-*` tokens fail the
lightness band and the chroma floor, sit at ΔE 11.6 between Events and Media
for normal vision (below the 15 floor), and all five land under 3:1 against the
surface. §3 forbids any colour outside the token list and §9.12 names these as
the series colours, so they stay — and every chart is instead built so that
**colour is never the encoding**: each bar carries its own name beside it, the
activity chart is a single series with a direct end label and no legend, and no
chart asks anyone to tell two domain hues apart. Worth a decision if you want
real multi-series charts later.

## Where the data comes from

`src/lib/tasks.ts` holds the model, the legal state transitions and the date
helpers; `src/lib/mockTasks.ts` holds the seed, with dates generated relative
to today so the My Day groupings stay meaningful. `src/store/taskStore.tsx`
applies every mutation locally and immediately — the swipe-to-advance needs the
row to move before any round trip — and each mutation returns an `undo` the
toast can call. Swapping the seed for `GET /me/day` and `GET /board/:slug`
should not change a single screen.

## Rules for building on this

1. **No component reads a colour, size or duration except from a token.**
   `grep` for a raw hex or an rgba outside `tokens.css` should come back empty.
2. **No screen introduces a one-off styled element.** If a screen needs
   something new, it becomes a component in `src/ui/` first.
3. `useBreakpoint()` is the only place `window.matchMedia` is read. Every
   mobile/desktop fork in §8 goes through it.
4. Only Anton, Inter and Instrument Serif. Anton is uppercased in CSS, never by
   typing in caps, so screen readers read words rather than letters.
5. Focus rings are never removed.
6. Permission-gated controls are absent from the DOM, not disabled — and a
   hidden control is a courtesy, never security. The server decides.
7. Check §14's 16-point list before calling a screen done.
