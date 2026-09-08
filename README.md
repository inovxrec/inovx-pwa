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

It needs a Supabase project. Put its URL and anon key in `.env.local`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Only the **anon** key belongs here — everything named `VITE_*` is compiled into
the bundle and served to every visitor. The service role key must never be one
of these; work that needs it belongs in an edge function.

Without those two the app still boots and every screen says so rather than
failing silently: `lib/supabase.ts` reports that it is not configured and the
providers surface that message.

The app opens at `/login`. Accounts are rows in `public.users` backed by
`auth.users`, and the two are kept in step by the `handle_new_user` trigger in
`20260909000000_auth_profile_mirror.sql` — an account with no profile is signed
straight back out, because a session with no role would be handed a member's
screens by default. An account whose `must_change_password` is set goes through
`/first-run` and then the tour, as §9.2 requires; whether the tour has been seen
is remembered per email in `localStorage` under `inovx.dev.entry`, so clearing
that key replays it.

### A local stack

The backend lives on the `integration` branch, not on `main` —
`.git/info/exclude` keeps `supabase/` out of the frontend's history, so SQL
changes have to be committed there.

```
supabase start
npm run db:reset      # applies the migrations, then both seed files
```

`db:reset` seeds the club from the member sheet — 39 people across the five
domains and core ops — and then `supabase/seed_local_auth.sql` gives every one
of them an account that can sign in.

**Everyone's first password is `demo`.** Every profile is marked
`must_change_password`, so the first sign-in lands on `/first-run` and cannot get
past it without setting a real one (§9.2). `demo` is four characters and fails
every rule on that screen, which is the point: it is a door key, not a password,
and the only screen it opens is the one that replaces it.

Roles come from the sheet, not from seniority:

| Who | Role | Why |
| --- | --- | --- |
| President, Vice President | `super_admin` | the only two who hold every admin key |
| COOs, CTO, Treasurer, Secretary | `admin` | approvals, occasions, recurring rules |
| Domain leads | `member` | they lead a board; `domains.lead_user_id` records that, and it is not a permission |
| Everyone else | `member` | |

So `adishwarseelan.sk.2024.csbs@rajalakshmi.edu.in` / `demo` is the super admin
sign-in, and `lalitha.b.2024.csbs@rajalakshmi.edu.in` / `demo` is the other.

That password is written down in a public repository on purpose: it opens a
database that lives on one laptop and listens on `127.0.0.1`. It is why that
file is registered as a **local** seed only — never run `supabase db push
--include-seed` against staging or production, which would create all 39
accounts there with it.

The roster has no faculty advisor in it, so nothing currently exercises the
faculty role (§9.6, read-only). Add an address to `scripts/gen_roster.py`'s
table and re-run it when there is one.

### Issuing a real account

Staging and production accounts are issued one at a time, from a terminal:

```
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role key> npm run provision -- --email someone@example.edu.in --name "Their Name"
```

It defaults to `super_admin` on the `core` domain; `--role`, `--domain` and
`--position` change that, and `--promote` raises an account that already
exists. The password is generated, printed once, stored nowhere, and good for a
single sign-in — the app requires a new one before any screen opens.

The service role key bypasses row level security completely. It goes in the
environment for the length of one command; it must never reach `.env.local`,
which Vite compiles into the bundle.

**/kitchen-sink** holds the Phase 1 review surface.

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
9. **Empty is now the ordinary state.** Every screen reads from Supabase, so a
   fresh project shows empty states everywhere until there are rows in it. That
   is correct, but it means `supabase/seed.sql` is the fastest way to see the
   app with something in it.
10. **The 404 button label.** §9.18 fixes it as "BACK TO MY DAY", but faculty
   have no My Day screen, so it now names whichever landing it actually goes
   to. Flagged in `SystemScreens.tsx`; easy to revert to the literal copy.


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

Five further motions, all off under `prefers-reduced-motion`:

- **The title reveal** — a screen's headline wipes up into place behind a hard
  edge, the way a title card resolves. Clip-path only, no fade or drift, and
  opted into per headline with `.title-reveal` rather than matched by position
  in the tree, which would silently stop working the moment a wrapper moved.
- **The tab rule travels** — one indicator slides between tabs instead of each
  tab growing its own underline, so the change reads as a single object moving
  rather than two separate fades. It measures with `offsetLeft`, not client
  rects, because the strip scrolls.
- **The rail's flame bar** grows out of its own centre on a destination change.
- **Stat figures roll into place** like a tape counter. Each digit is a window
  onto a strip of 0–9 twice, travelling to the second copy of its value, so
  every digit turns a full cycle whatever it lands on — a 1 that moved one notch
  would not read as a counter. The real number sits in the DOM as text for a
  screen reader; the strip is decoration over it.
- **A brush button repaints on press**, the stroke laid down left to right over
  220ms. Driven from a class rather than `:active`, which lasts exactly as long
  as the finger is down and would cut the sweep short on a tap.
- **The board columns cross-fade** when the filter changes — keyed on the
  filter, deliberately not on the search text, since re-running it per keystroke
  would strobe.
- **A task title morphs from its card into the drawer**, using the View
  Transitions API where the browser has it and falling back to the plain state
  change where it does not. The card gives up its `view-transition-name` in the
  same update the drawer takes it, which is what makes the browser treat them as
  one element — two elements may never hold the same name at once.


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

`src/lib/analytics.ts` derives everything from the task list and the roster, so
the decks and the board can never disagree. Nothing in it is seeded — where the
history is not recorded, the chart is absent rather than filled in.

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
  domain away as well as give one: a grant scoping the Events lead to Design
  and Media removes Events.
- A GRANT with no chips means every domain: the chip row is a narrowing, so
  choosing none of them cannot mean choosing nothing.
- A REVOKE means none. They can still raise work for themselves.

Committees follow membership: a super admin runs all of them, everyone else
runs the ones they are actually on. Being allowed to assign into Design does
not make someone a member of the Techfest committee.

`store/grantStore` reads the overrides out of `user_permissions` through the
club provider, and §9.17's screen writes them back, so a saved change takes
effect immediately in the new-task form. **The domain scoping is not enforced
by the server yet** — see the schema gaps above. The form never
offers a target the server would refuse — an ungranted domain is absent from
the list, not disabled (§14 item 13).

## Where the data comes from

Supabase, and nothing else. **There is no mock data left in the frontend** —
`src/lib/mockTasks.ts` is gone, and so is every seeded constant that used to
sit in `lib/club.ts`, `lib/admin.ts` and `lib/analytics.ts`.

| | |
|---|---|
| `lib/supabase.ts` | the client, plus `isConfigured` and `describeError` |
| `lib/db/rows.ts` | row types mirroring the migration, hand-written |
| `lib/db/map.ts` | row to app shape — `toTask`, `toPerson`, `toMeeting` and the rest |
| `lib/db/queries.ts` | every read and write, in one file |
| `store/ClubProvider.tsx` | tenure, domains, people, roster, committees, grants — one fetch, not five |
| `store/taskStore.tsx` | the task list, with write-through mutations |

`src/lib/tasks.ts` still holds the model, the legal state transitions and the
date helpers, none of which come from the database.

`taskStore` applies every mutation locally first — the swipe-to-advance needs
the row to move before any round trip — writes it through, and puts the row
back if the server refuses. Each mutation still returns an `undo` the toast
can call.

A screen whose data has no table says so by naming the table it is waiting on,
rather than showing an empty state — an empty state is a claim about the club,
not about the software.

## Notifications

Three channels, at three different stages.

**In-app works.** Database triggers file a row in `notifications` whenever work
is assigned, a task is approved or sent back, someone comments, or a meeting is
scheduled — see `20260915000000_notifications.sql`. Triggers rather than client
code on purpose: a notification must not depend on the sender's browser staying
open, and RLS correctly stops a member inserting rows for other people.

**Push works, once it is set up.** Web Push is a browser standard, so there is
no service, no account and no per-message cost — the VAPID key pair below *is*
the identity, and Chrome, Firefox and Safari each deliver for free.

```
node scripts/generate-vapid-keys.mjs        # once, then keep them
# public half  -> VITE_VAPID_PUBLIC_KEY in .env.local
# private half -> supabase secrets set VAPID_PRIVATE_KEY=...
npx supabase functions deploy send-push
```

Then point the database at the function, which is what `deliver_push` calls:

```sql
insert into app_config (key, value) values
  ('push_function_url', 'https://<ref>.functions.supabase.co/send-push'),
  ('service_role_key',  '<service role key>')
on conflict (key) do update set value = excluded.value;
```

Unconfigured is a safe state: the trigger files the in-app notification and
returns, so a missing key costs a buzz rather than breaking the task move that
caused it.

**Push cannot be tested with `npm run dev`** — `useServiceWorker` deliberately
skips registration in dev, and no service worker means no push. Use a real
build:

```
npm run build && npx vite preview     # http://localhost:4173
```

Coverage is not uniform, and the UI says so rather than pretending: Android and
desktop work from an ordinary tab; **iPhone and iPad only after the app is added
to the home screen**, because Safari gives a plain tab no push at all. That is
Apple's rule, and §9.16's install card exists to explain it.

**Email is wired for Brevo and needs an account.** Two separate uses:

*Password resets.* Supabase's own sender is rate limited to a handful an hour,
which is not enough for 39 people to reset on the same afternoon. Configure SMTP
in the dashboard under **Authentication → Emails → SMTP Settings**:

```
host    smtp-relay.brevo.com        port  587
user    <Brevo SMTP login>          pass  <Brevo SMTP key>
sender  <a verified Brevo sender>
```

Once that is set, "Forgot password" on the sign-in screen is a real flow: it
emails a link that lands on `/first-run`, which is already the screen that sets
a password. It says the same thing whether or not the address has an account —
a form that said "no such account" would let anyone test which of the club's
addresses are real.

*Notification email.* `functions/send-digest` sends one summary per person
rather than one email per event, which is both kinder and the only thing that
fits 300 emails a day. It reads the same matrix the Settings screen writes, and
email is off by default there, so it sends to nobody until someone opts in.

```
npx supabase functions deploy send-digest
npx supabase secrets set BREVO_API_KEY=xkeysib-...   DIGEST_FROM_EMAIL=inovx@yourdomain.com DIGEST_FROM_NAME="INOVX Ops"   APP_URL=https://<where the app is hosted>
```

Then schedule it — once a day is the point of a digest:

```sql
select cron.schedule('nightly-digest', '0 18 * * *', $$
  select net.http_post(
    url := 'https://<ref>.functions.supabase.co/send-digest',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select value from app_config where key = 'service_role_key'))
  );
$$);
```

**The sending address is the part to sort out first.** Sending as
`@rajalakshmi.edu.in` needs DNS records the college IT department controls; if
they will not add them, verify a single sender address in Brevo instead — it
works without DNS, with weaker deliverability.

## Who the server lets in

`20260910000000_real_rls_policies.sql` replaced the foundation migration's
placeholders, which had enabled RLS everywhere and then granted almost nothing
— under default-deny that made the whole app read-only for everyone, super
admins included.

The policies are built on `effective_permission(key)`, which reads a person's
override out of `user_permissions` and falls back to the role default. Those
defaults are a copy of `src/lib/permissions.ts`; **change one and you must
change the other**, or the UI will offer a control the server refuses. §12 still
holds — the UI hiding a control is a courtesy, and this file is what decides.

`20260911000000_task_activity_cascade.sql` fixes a related foundation bug: the
immutability trigger on `task_activity` fired on the `ON DELETE CASCADE` from
its own parent, so **no task that had ever been touched could be deleted**. The
trigger now covers UPDATE only; deletion through the API was already impossible,
because the activity log has no DELETE policy.

## What the backend still owes the frontend

Everything below is missing from the foundation schema, so the screen that
wanted it says it is not wired up instead of inventing a number:

- **No `completed_at` on `tasks`.** A task records a status and no finish date,
  so the twelve-week activity chart on Insights and Oversight has no week axis
  to plot against, and no stat tile can draw a seven-point sparkline. The
  leaderboard is a standing all-year total for the same reason, and says so.
- **No job runner behind the occasion engine or the syncs.** The tables landed
  in `20260908000000_occasions_and_integrations.sql` — `occasions`,
  `integrations`, `integration_conflicts` — so `/admin/occasions` and
  `/admin/integrations` read and write real rows. Nothing yet turns an occasion
  into a task at its lead time, and nothing runs a sync: "run now" records
  `sync_requested_at` and the card keeps showing how stale the last sync is
  rather than turning green.
- **No archive figures.** `tenures` carries a name and its dates — not a head
  count, a completed total or a president — so the tenure cards show dates.
- **`user_permissions` has no scope column.** A `task.assign` grant cannot yet
  be narrowed to particular domains, which is exactly what §9.17's chip row
  edits. The scope currently lives in the frontend only; it needs a `domains`
  column or a join table before the server can honour it.
- **No `cancelled` status.** `tasks.status` allows six values and the UI models
  a seventh.
- **No link column on `meetings`.** A join link rides in `description` and is
  read back out by `toMeeting`; a real column would be better.
- **No action items on `meetings`.** §9.11 turns each into a task in one tap;
  they are held for the session and not saved.
- **No account provisioning from the browser.** Issuing an account needs the
  service role, which must not be in the bundle, so "Add member" stops at the
  form and points at the `bulk-import-members` function.

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
