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

**All eight phases of the §13 build order are done.**

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
| ✅ Calendar | `/calendar` — §9.9, month grid on desktop, agenda + week strip on mobile |
| ✅ People | `/people` — §9.10, card grid, compact list, and the birthdays tab |
| ✅ Meetings | `/meetings` — §9.11, attendance, minutes, action items → tasks |
| ✅ Notifications | `/notifications` — §9.13, grouped today/earlier with unread state |
| ✅ Settings | `/settings` — §9.14, accordion sections, the notification matrix, sign out |
| ✅ Admin | `/admin/*` — §9.15, all eight screens, each gated on its own key |
| ✅ Permissions | `/admin/permissions` — §9.17, two panes, live preview, save bar |
| ✅ PWA | `public/manifest.webmanifest` + `public/sw.js` — installable, boots offline |
| ✅ Passes | Accessibility, responsive at all four widths, reduced motion |

Every screen in §9 is now built; the placeholder component and its route
wiring are gone. What is left is Phase 8 — the manifest, the service worker,
and the three passes over everything already standing.

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
1. **The logo asset sits at a different path to the one §2 names.** §2 says
   `public/brand/inovx-logo.png`; the file supplied is
   `public/inovx-wordmark-light.webp` — the same mark, with an alpha channel.
   The code follows the file that exists rather than moving it. Say the word if
   you would rather it lived at §2's path and I will move it and update the two
   references.
2. **The brush at wide sizes.** The §6.1 paths stretch with
   `preserveAspectRatio="none"`, so a full-width button flattens into a smooth
   lozenge rather than reading as hand-painted. Worth a look on
   `/kitchen-sink` before it ends up under every primary action.
3. **The login screen drops two things §9.1 asks for.** The display-1 "INOVX
   OPS" under the logo (§9.1.3) and the "internal system · accounts are issued
   by the core team" line under the card (§9.1.5) were both removed on request:
   the wordmark already says INOVX, and the second line told a member something
   they could not act on. The `h1` stays in the document, unseen, because the
   screen still needs exactly one (§11) and the logo above it is an image.
4. **"Forgot password" has no destination.** §9.1 asks for the control but
   names no screen, and §15 says not to invent one. It currently reveals a line
   saying to ask a core team member, since accounts are issued by hand. Say if
   a real reset flow is wanted.
5. **Two decorations on My Day.** §9.4 asks for tape on the overdue card *and*
   a pin on the announcement, but §6.3 caps a screen at one of the two. The
   tape goes to the overdue block when there is one, otherwise the pin marks
   the announcement. Say which you would rather have.
6. **The compact task card shows a state word, not just a dot.** §7.10 says
   dot alone; §14 item 11 rules out colour-only information. The word rides
   with the dot.
7. **Red bars.** A domain or member with an overdue task draws its bar in
   `--st-blocked` instead of its domain colour. The value label always says
   "· N late" alongside, so the colour is never the only signal — but say if
   you would rather the bar always kept its domain colour.
8. **`--dom-core` is the same value as `--paper`.** A core member's avatar and
   a "Core" tag both vanished on a paper card. Both now carry a hairline so
   they still read as a chip — but the token itself is the underlying problem,
   and §3 fixes its value, so it is worth a decision.
9. **Loading states are designed but unexercised.** Every screen reads from a
   synchronous store, so nothing ever spends a frame loading. `SkeletonTaskCard`
   exists and My Day takes a `loading` prop, but until the store becomes a real
   fetch there is nothing to trigger them. Worth wiring properly the moment the
   API lands, rather than faking a delay now.
10. **The 404 button label.** §9.18 fixes it as "BACK TO MY DAY", but faculty
   have no My Day screen, so it now names whichever landing it actually goes
   to. Flagged in `SystemScreens.tsx`; easy to revert to the literal copy.

## Temporary scaffolding

`AuthProvider` fakes `login` against a hardcoded table and remembers the entry
flags in `localStorage`; `setRole` and the `/kitchen-sink` switcher jump into
the shell as another role without signing out. All of it is marked `TEMP` and
goes when `/api/auth/login` lands — the `Session` shape should not need to
change.

## The opening title

`ui/brand/LogoIntro` runs on every load of the document — which is what
"opening the app" means for an installed PWA, and not on client-side
navigation. The wordmark builds letter by letter, holds, then I N O V retract
and the X grows into the mark the app icon and favicon use, so the thing you
tapped is the thing you land on.

The letters are **cropped out of the real wordmark, not typeset**: five windows
onto the same file, each showing one glyph. The offsets in `ui/brand/glyphs.ts`
were measured by scanning the source's columns for the empty gutters between
letters, not by eye — if the asset is replaced, remeasure rather than nudge
them. There is no second copy of the logo to keep in step with the first.

Retro-techy without the CRT, since §0 withdrew the INOVX84 terminal look: it
borrows the record vocabulary already in the system — pressed grooves, the
halftone, a played waveform — and adds one machine-like scan of a flame rule.
No scanlines, no glow, no gradient.

The app renders underneath the whole time, so nothing waits on the animation.
**It is skippable by any tap or key**, and it does not run at all under
`prefers-reduced-motion` — someone who has asked for less movement should not
be made to sit through the one screen that is nothing but movement.

It is about 1.9 seconds. For a tool §1.1 says people open eight times a day
between classes, that is real friction; the skip is the mitigation, and the
timings are one table at the top of the component if you want it shorter.

## The record-sleeve motifs

The system leans on a modern-retro record aesthetic on top of the §1 direction —
static, monochrome, and inside the existing token list, since none of it touches
colour:

- **`Waveform`** (`src/ui/signature/`) — a symmetric soundwave, mirrored about a
  centre line, seeded from a string so a screen draws the same wave every render
  but two screens do not look stamped. Used as a rule under a lockup or headline.
- **`Grooves`** — concentric record grooves running off a hero's edge, the
  companion to `Halftone` (§6.4) and used the same way: on `--ink` only, never on
  paper, never animated.
- **`.sleeve`** — registration marks at a card's two opposite corners, the way a
  printed sleeve carries crop marks. Not a border: §5.2 is explicit that cards
  have none, so these are four short rules that stop well short of meeting.
- **`.track-no`** — leading-zero tabular numerals, as a sleeve lists its tracks.

**The entry screens' wave plays.** On login and first run the bars breathe on
their own periods, the way a spectrum does while something is running. This is
a **deviation from §10**, which allows one looping animation in the product and
forbids ambient movement — asked for directly, and confined to the entry
screens: no wave inside the signed-in app plays, so the rule still holds
everywhere someone is trying to get work done. It stops dead under
`prefers-reduced-motion`.

Three further motions, all one-shot and all off under
`prefers-reduced-motion`:

- **The playhead** — a flame hairline draws once across the top of a screen as
  it arrives, the way a track scrubs. §10's "nothing slides horizontally"
  governs the page's own content, which still only fades and rises; this is a
  rule in the chrome above it.
- **The waveform plays in** — bars grow out of the centre line, 8ms apart, so
  the phrase lands inside ~300ms however many bars there are. Opt-in per usage:
  a wave that redrew on every re-render would be ambient movement, which §10
  forbids.
- **The list stagger §10 already asked for** — 20ms a child, capped at six,
  then the rest at once. It was specified from the start and had never been
  built; it is now on the board columns, the mobile board groups and My Day.

§10 still allows exactly one *looping* animation in the product, and it is
still the skeleton pulse. Nothing added here repeats.

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

## The PWA

`public/manifest.webmanifest` and `public/sw.js`, registered by
`ui/nav/UpdatePrompt` at the app level rather than inside the shell — the shell
only mounts for someone signed in, and the login screen is exactly where an
offline boot matters.

**The service worker deliberately does not cache API responses.** Task data
that is quietly hours stale is worse than data that is honestly absent: the
offline banner states when the last sync was, and that promise only holds if
nothing is being served from a cache behind it. The shell and the hashed build
assets are cached; navigations are network-first and fall back to the cached
shell.

A waiting worker raises §9.18's "A new version is ready" toast, which persists
until acted on because it carries an action.

**The icons are generated from the real wordmark.** Run
`node scripts/generate-icons.mjs` and open the address it prints; it rasterises
`public/inovx-wordmark-light.webp` into the five files §2 names and writes them
to `public/icons`. Node cannot decode WebP without a dependency and the browser
already can, so the drawing happens there and the bytes come back to be
written. Nothing about that script ships — its page is served from memory, not
from `public/`.

Rerun it whenever the wordmark changes. The sizes, padding and file names are
the ones §2 specifies and should not change.

**Which icons show what.** §2 says to generate all of them from the logo, and
separately that below 88px the X glyph alone is the app mark. The home-screen
and tab sizes — 32, 180, 192 — render small enough that a 2.8:1 wordmark inside
them is an illegible strip, so they take the X. The 512 and the maskable 512,
which are used for splash screens and listings, take the full mark. Say if you
would rather they were consistent either way.

**The favicon is the one icon without the ink tile.** §2 puts every generated
icon on `#0B0B0B`; a tab strip has its own colour and the browser theme changes
it, so a black square sits in it as a visible tile rather than as the mark. The
32px favicon is drawn on transparency instead. The other four keep the ink
ground — a home-screen icon needs its own tile, and iOS composites away any
transparency anyway.

## What Phase 8's passes found

- **Responsive.** Checked at 375, 768, 1024 and 1440 by loading the app in a
  same-origin iframe, since this environment cannot resize the browser window.
  An iframe gets its own viewport, so `matchMedia` and the media queries inside
  it respond to the frame rather than the window. Every §8 fork was confirmed
  taking its mobile half: bottom bar, the grouped board list, the agenda and
  its jump strip, the Permissions two-step, the per-event notification
  accordion, and DataView's card stack.
- **Accessibility.** A skip link ahead of the nav; `main` made focusable so the
  skip actually moves focus; the shell now takes its title from the nearest
  ancestor that names itself, so nested routes stop announcing the app name.
  One `h1` per screen — the Header owns it inside the shell, and the three
  screens outside it declare their own. `grep` for a raw hex outside
  `tokens.css` comes back empty.
- **Reduced motion.** The global rule now collapses `animation-delay` as well
  as duration: a staggered child whose animation was cancelled but whose delay
  survived would sit invisible at its from-state for up to 100ms.

## Who can raise work, and where

Admins and super admins raise tasks; members do not. **A super admin decides
whether an admin can assign into domains at all, and which ones** — and that
decision is the scoped `task.assign` grant §9.17's screen already edits, rather
than a second mechanism sitting beside it.

- Inherited, an admin runs their own domain and a member runs none.
- A GRANT with domain chips means exactly those domains. The scope **replaces**
  the inherited default rather than adding to it, so the control can take a
  domain away as well as give one — Arjun is the Events lead, and the seeded
  grant scoping him to Design and Media removes Events.
- A GRANT with no chips means every domain: the chip row is a narrowing, so
  choosing none of them cannot mean choosing nothing.
- A REVOKE means none. They can still raise work for themselves.

Committees follow membership: a super admin runs all of them, everyone else
runs the ones they are actually on. Being allowed to assign into Design does
not make someone a member of the Techfest committee.

`store/grantStore` holds the overrides and §9.17's screen writes to it, so a
saved change takes effect immediately in the new-task form. The form never
offers a target the server would refuse — an ungranted domain is absent from
the list, not disabled (§14 item 13).

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
