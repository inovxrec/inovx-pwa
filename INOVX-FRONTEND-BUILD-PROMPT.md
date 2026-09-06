# INOVX — FRONTEND BUILD PROMPT

> **How to use this file.**
> 1. Drop `inovx-logo.png` into your Claude Code session and save it to `public/brand/inovx-logo.png`.
> 2. Save this file at the repo root as `FRONTEND_BUILD_PROMPT.md`.
> 3. Tell Claude Code: *"Read FRONTEND_BUILD_PROMPT.md in full, then build the design system in Phase 1. Do not skip ahead."*
> 4. Build in the phase order at the end of this document. Do not let it build screens before tokens and primitives exist.

---

## 0. CONTEXT — READ FIRST

You are building the **frontend** of INOVX Ops, an internal task-management PWA for a college club with about 45 members, five domains (Technical, Management, Events, Media & PR, Design), cross-domain committees, and faculty coordinators with read-only access.

**This document supersedes any previous visual direction.** Any earlier "INOVX84" CRT/terminal aesthetic is withdrawn. Delete it if it exists. The product now uses the design system defined below.

The functional requirements — roles, permissions, data model, API, occasion engine — live in the separate build document. **This file governs everything visual and interactive.** Where the two disagree on appearance, this file wins.

---

## 1. THE DESIGN DIRECTION

**Name:** INOVX STUDIO.

**In one line:** a neo-brutalist sticker-book — cream and mint paper cards floating on true black, oversized condensed headlines, hand-painted orange brush strokes for actions, black-outlined pill chips, and bold black-and-white sticker illustrations.

**The feeling:** a printed zine or a tattoo flash sheet that happens to be a task manager. Confident, physical, high-contrast, a little handmade. Not corporate SaaS. Not a terminal. Not glassmorphism. Not a gradient anywhere.

### 1.1 The five rules that define it

1. **Black is the ground, paper is the content.** The page is true black. Content lives on cream or mint "paper" cards that sit on it. Text is almost always dark-on-paper, not light-on-black. The exception is full-bleed hero sections and the nav chrome.
2. **One flame per view.** The orange brush stroke marks the single most important action on a screen. Two orange buttons in one viewport means neither is primary. Everything else is black-fill or outlined.
3. **Type is the loudest thing.** Headlines are enormous, condensed, uppercase and tight. They do the work that colour and decoration would do in a lesser system.
4. **Everything is a rounded rectangle or a pill.** No sharp corners anywhere except the brush strokes and stickers, which are deliberately irregular.
5. **Compact by default.** This is a tool people open eight times a day on a phone between classes. Every screen must show real content above the fold. Generous whitespace is not the goal; confident density is.

### 1.2 Explicitly banned

Gradients of any kind · drop shadows for depth (the one allowed shadow is a hard offset sticker shadow) · glassmorphism / backdrop blur · thin hairline 1px type · emoji as icons · Material Design components · Bootstrap look · pastel-on-white cards · centre-aligned body paragraphs · loading spinners (use skeletons) · any font other than the three named below · any colour not in the token list.

---

## 2. THE LOGO

The file is at `public/brand/inovx-logo.png`. It is the INOVX wordmark: blue "I", white outlined "N O V", an amber bar inside the "O", and a red/blue "X".

**Rules:**

- The logo's letters are white with thin outlines, so it **only works on dark surfaces.** Never place it directly on a cream or mint card.
- If it must appear on paper, put it inside a black chip: `background: var(--ink); border-radius: 12px; padding: 10px 14px;`.
- Never recolour, stretch, rotate, add effects to, or place it inside a coloured shape other than the black chip.
- Minimum clear space on all sides = the height of the "I".
- Minimum width: 88px. Below that, use the "X" glyph alone as an app mark.
- **Generate from it:** `favicon.ico` (32px), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (logo centred on `#0B0B0B` with 20% safe padding), and `apple-touch-icon.png` (180px). All on `#0B0B0B`.
- In the app header, pair the logo image with the word set in Anton where a lockup is needed. Do not re-typeset the logo itself.

---

## 3. DESIGN TOKENS

Create `src/styles/tokens.css` with exactly this. **Every colour and size in the entire application comes from here.** A raw hex or a magic pixel value anywhere else in the codebase is a bug.

```css
:root {
  /* ---------- GROUND ---------- */
  --ink:          #0B0B0B;   /* page background, primary text on paper */
  --ink-raised:   #151515;   /* raised surface on black — nav, sticky bars */
  --ink-sunken:   #050505;   /* image wells, video wells */
  --ink-line:     rgba(244,239,224,0.14);  /* hairline on black */
  --ink-line-2:   rgba(244,239,224,0.26);  /* stronger hairline on black */

  /* ---------- PAPER (primary card stock) ---------- */
  --paper:        #F4EFE0;
  --paper-hi:     #FBF8F0;   /* inner surface on paper, input fields */
  --paper-lo:     #E7E0CD;   /* pressed / selected paper */
  --paper-line:   rgba(11,11,11,0.14);
  --paper-line-2: rgba(11,11,11,0.30);

  /* ---------- MINT (secondary card stock) ---------- */
  --mint:         #C3DDDC;
  --mint-hi:      #D9EAE9;
  --mint-lo:      #AFCFCE;
  --mint-line:    rgba(11,11,11,0.16);

  /* ---------- FLAME (the one accent) ---------- */
  --flame:        #EF4E24;
  --flame-hover:  #FF6033;
  --flame-press:  #D63F18;
  --flame-soft:   rgba(239,78,36,0.12);

  /* ---------- TEXT ---------- */
  --on-paper:      #0B0B0B;
  --on-paper-mute: #6B655A;
  --on-paper-faint:#948D80;
  --on-ink:        #F4EFE0;
  --on-ink-mute:   #9A958A;
  --on-ink-faint:  #6E6A61;
  --on-flame:      #FFFFFF;

  /* ---------- DOMAIN CHANNELS (riso sticker stock) ---------- */
  /* Always paired with --ink text. Never used for semantic state. */
  --dom-technical:  #7FD1B9;
  --dom-management: #9DB8F0;
  --dom-events:     #FF9B6A;
  --dom-media:      #F5A3C7;
  --dom-design:     #F2C94C;
  --dom-core:       #F4EFE0;   /* core team, committees, club-wide */

  /* ---------- SEMANTIC STATE ---------- */
  --st-todo:      #8A857A;
  --st-progress:  #2E6BE6;
  --st-review:    #E0930A;
  --st-done:      #1F9D5B;
  --st-blocked:   #D62828;
  --st-proposed:  #7A5AF8;
  --st-cancelled: #948D80;

  /* ---------- SPACE (the only allowed gaps) ---------- */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 20px; --s-6: 24px; --s-7: 32px; --s-8: 40px;
  --s-9: 56px; --s-10: 72px;

  /* ---------- RADIUS ---------- */
  --r-xs: 8px;   /* tags, small chips */
  --r-sm: 12px;  /* inputs, inner blocks, logo chip */
  --r-md: 16px;  /* buttons, small cards */
  --r-lg: 20px;  /* standard card */
  --r-xl: 28px;  /* hero card, sheet, modal */
  --r-pill: 999px;

  /* ---------- BORDER ---------- */
  --b-hair: 1px;
  --b-bold: 2px;   /* outlined chips, focus, selected */

  /* ---------- THE ONE SHADOW ---------- */
  --sticker-shadow: 4px 4px 0 var(--ink);

  /* ---------- MOTION ---------- */
  --t-fast:   90ms;
  --t-base:   160ms;
  --t-slow:   260ms;
  --ease:     cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* ---------- LAYOUT ---------- */
  --nav-rail:   232px;   /* desktop left rail */
  --nav-bottom: 62px;    /* mobile bottom bar */
  --header-h:   58px;
  --content-max: 1360px;
  --read-max:    68ch;
  --z-nav: 40; --z-sticky: 50; --z-drawer: 60; --z-modal: 70; --z-toast: 80;
}
```

**Theme:** dark-grounded only. There is no light mode. Set `color-scheme: dark` and paint `body { background: var(--ink); color: var(--on-ink); }` explicitly. Do not build a theme toggle.

### 3.1 Tailwind config (if using Tailwind)

Map every token; do not use Tailwind's default palette at all.

```js
// tailwind.config.ts — theme.extend
colors: {
  ink:   { DEFAULT:'#0B0B0B', raised:'#151515', sunken:'#050505' },
  paper: { DEFAULT:'#F4EFE0', hi:'#FBF8F0', lo:'#E7E0CD' },
  mint:  { DEFAULT:'#C3DDDC', hi:'#D9EAE9', lo:'#AFCFCE' },
  flame: { DEFAULT:'#EF4E24', hover:'#FF6033', press:'#D63F18' },
  dom:   { technical:'#7FD1B9', management:'#9DB8F0', events:'#FF9B6A',
           media:'#F5A3C7', design:'#F2C94C', core:'#F4EFE0' },
  st:    { todo:'#8A857A', progress:'#2E6BE6', review:'#E0930A',
           done:'#1F9D5B', blocked:'#D62828', proposed:'#7A5AF8' },
},
borderRadius: { xs:'8px', sm:'12px', md:'16px', lg:'20px', xl:'28px', pill:'999px' },
fontFamily: {
  display: ['Anton','Arial Narrow','Impact','sans-serif'],
  sans:    ['Inter','system-ui','sans-serif'],
  quote:   ['"Instrument Serif"','Georgia','serif'],
},
boxShadow: { sticker: '4px 4px 0 #0B0B0B' },
```
Disable Tailwind's default `colors`, `borderRadius` extras and `boxShadow` so nobody can reach for `bg-blue-500` or `rounded-lg` by accident.

---

## 4. TYPOGRAPHY

Three families. No fourth. Load from Google Fonts with `display=swap` and real fallback stacks.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@1&display=swap">
```

| Role | Family | Used for |
|---|---|---|
| **Display** | Anton, uppercase | Screen titles, card headlines, big numbers, buttons, nav labels, the wordmark |
| **UI / Body** | Inter | Task titles, descriptions, comments, form fields, tables, help text — everything a person reads at length |
| **Quote** | Instrument Serif *italic* | One thing only: pull-quotes and the empty-state one-liners. Never for UI |

### 4.1 Type scale — memorise this, use nothing else

| Token | Size / line-height | Family | Rules |
|---|---|---|---|
| `display-1` | `clamp(40px, 9vw, 76px)` / 0.88 | Anton | Uppercase. Letter-spacing `-0.005em`. Login + landing screen titles only. `text-wrap: balance` |
| `display-2` | `clamp(28px, 5.5vw, 44px)` / 0.94 | Anton | Uppercase. Screen titles, hero card headlines |
| `display-3` | `clamp(20px, 3.4vw, 28px)` / 1.02 | Anton | Uppercase. Card headlines, section titles |
| `display-4` | `16px` / 1.15 | Anton | Uppercase, letter-spacing `0.04em`. Sub-section headers, table group headers |
| `body-lg` | `17px` / 1.55 | Inter 400 | Intro paragraphs, task descriptions |
| `body` | `15px` / 1.55 | Inter 400 | Default. Task titles use Inter **600** at this size |
| `body-sm` | `13.5px` / 1.5 | Inter 400 | Table cells, comment bodies, secondary info |
| `label` | `11px` / 1 | Inter 600 | **UPPERCASE**, letter-spacing `0.12em`. Field labels, chip text, meta rows, nav labels |
| `micro` | `10px` / 1 | Inter 600 | Uppercase, letter-spacing `0.14em`. Timestamps, counts, badge text |
| `num-xl` | `clamp(32px, 6vw, 52px)` / 1 | Anton | Stat card numbers. `font-variant-numeric: tabular-nums` |

### 4.2 Typography rules

- **Anton is uppercase only.** Never set it in sentence case. It has no lowercase personality.
- **Anton never runs longer than 6 words.** If a headline needs a sentence, it is not a headline.
- Body copy is **never** uppercase except a short marketing-style line inside a card (max 2 lines, Inter 700, letter-spacing `0.01em`) — copy the "DISCOVER DESIGNS, BOOK ARTISTS…" treatment from the reference.
- Running text is capped at `--read-max` (68ch).
- All numbers that appear in a column or a stat use `font-variant-numeric: tabular-nums`.
- Minimum type size anywhere in the product is **10px**, and only for `micro` uppercase labels. Body text never goes below 13.5px.
- `text-wrap: balance` on every Anton headline; `text-wrap: pretty` on paragraphs.

---

## 5. SHAPE, SURFACE & DENSITY

### 5.1 The three surfaces

| Surface | Background | Text | Use for |
|---|---|---|---|
| **Ground** | `--ink` | `--on-ink` | The page itself, nav chrome, sticky bars, image wells |
| **Paper** | `--paper` | `--on-paper` | The default card. ~70% of all content |
| **Mint** | `--mint` | `--on-paper` | The second card in a stack, secondary/informational blocks, "what's coming" panels |

**Alternation rule:** in any vertical stack of cards, alternate paper → mint → paper. Never two mint cards adjacent. Never more than 2 mint cards on one screen.

**Nesting rule:** maximum two levels. A paper card may contain a `--paper-hi` inner block. That inner block may not contain a third surface.

### 5.2 Card anatomy

```
Card (radius --r-lg, no border, no shadow)
├─ padding: 16px mobile / 20px desktop
├─ optional eyebrow    → label, --on-paper-mute
├─ headline            → display-3, --on-paper
├─ optional meta rows  → label left / body-sm right, separated by 1px --paper-line
├─ body / children
└─ optional action     → full-width brush or black button, 12px above bottom edge
```

- Cards have **no border and no shadow.** They separate from the black ground by contrast alone. This is the single biggest thing to get right — adding a border makes it look like Bootstrap immediately.
- Corner radius on the outer card is `--r-lg` (20px). A hero card on the login or landing screen may use `--r-xl`.
- The gap between stacked cards is `--s-3` (12px) on mobile, `--s-4` (16px) on desktop. Tight. The black gap between cream cards is a design element.

### 5.3 The sticker shadow

The only shadow in the system: `--sticker-shadow` (`4px 4px 0 var(--ink)`). It applies **only** to outlined chips and sticker illustrations that sit on a paper card, and only when they need to feel like they were stuck on. Never on a card, never on a modal, never on a button.

### 5.4 Density — this is a requirement, not a preference

| Property | Mobile (<640) | Tablet (640–1023) | Desktop (≥1024) |
|---|---|---|---|
| Page horizontal padding | 14px | 20px | 28px |
| Card padding | 16px | 18px | 20px |
| Gap between cards | 12px | 14px | 16px |
| List row height | 56px | 56px | 48px |
| Table row height | — (cards) | 44px | 44px |
| Section top margin | 24px | 28px | 32px |
| Button height (default) | 44px | 42px | 40px |
| Input height | 46px | 44px | 42px |

**Compactness acceptance tests — every screen must pass all four:**
1. On a 375×667 viewport, at least **two full content cards** are visible without scrolling, below the header.
2. On a 1440×900 viewport, no screen has more than **one screen-height of scroll** for a typical data load.
3. No decorative block taller than 120px exists anywhere except the login screen.
4. No section header is followed by more than 24px of empty space before its content.

---

## 6. THE SIGNATURE ELEMENTS

These four things are what make it look like the reference instead of a generic dark app. Build them first, in `src/ui/signature/`.

### 6.1 BrushStroke — the primary action

An irregular hand-painted swatch used as the background of the primary button. It is an inline SVG behind the label, **not** a border-radius.

```tsx
// src/ui/signature/BrushStroke.tsx
// Three path variants so repeated buttons on one screen don't look stamped.
export const BRUSH_PATHS = [
  "M6 38 C46 14 132 6 226 9 C318 12 378 19 406 26 C416 29 414 45 402 50 C352 65 186 70 98 63 C50 59 12 51 6 38 Z",
  "M9 30 C60 10 140 4 232 8 C316 12 382 22 405 30 C414 33 408 48 396 52 C338 66 168 68 84 60 C42 56 10 44 9 30 Z",
  "M7 34 C52 16 128 8 220 10 C312 12 380 17 404 24 C415 27 411 47 398 51 C344 64 176 71 92 64 C46 60 11 47 7 34 Z",
];
// Render: <svg viewBox="0 0 420 72" preserveAspectRatio="none" aria-hidden="true">
//           <path d={BRUSH_PATHS[variant]} fill="currentColor" />
//         </svg>
// The SVG is absolutely positioned, inset 0, colour = --flame (or --ink for the dark variant).
// The label sits above it with position:relative and z-index:1.
```

Rules:
- Pick the variant deterministically from a hash of the button's label so it is stable across renders but varies between buttons.
- The stroke extends ~6px beyond the label box on all sides. Label padding is `12px 22px`.
- Two colourways: **flame** (primary action on paper) and **ink** (secondary emphasis on paper, as seen on the reference's "BOOK" button).
- Hover: the whole SVG scales to `1.02` from centre over `--t-fast`. Active: `0.985`. No colour change.
- On a black ground the brush button uses flame fill with `--on-flame` text.
- Reduced motion: no scale.

### 6.2 Sticker — the illustration slot

Black-and-white line-art illustrations, ~1.5px stroke weight, high contrast, slightly naïve. They appear on paper cards to give a screen personality.

- Ship them as inline SVG components in `src/ui/stickers/`, all using `currentColor` so they inherit `--on-paper`.
- **Required set for v1:** `StickerClipboard` (empty board), `StickerCalendar` (no occasions), `StickerBell` (no notifications), `StickerLock` (no permission), `StickerTrophy` (leaderboard), `StickerCoffee` (nothing due today), `StickerRocket` (onboarding complete), `StickerPin` (pinned announcement), `StickerCloudOff` (offline).
- Sizes: 48px inline, 96px in an empty state, 132px on the login screen.
- Never colour them. Never animate them except a single 200ms fade-in.
- May carry `--sticker-shadow` when they sit on a paper card as a decoration.

### 6.3 Tape & pin — decoration, used sparingly

A small strip of "washi tape" (a 4° rotated rectangle at 55% opacity in a domain channel colour) or a pin sticker, anchored at a card's top-left or top-right corner and overflowing it by ~8px.

- **Maximum one tape or pin element per screen.** It marks the single most important card — the pinned announcement, or the overdue block.
- `aria-hidden="true"`. Purely decorative.

### 6.4 Halftone — the texture

A dot pattern used behind hero areas and inside image wells so photographic content matches the printed feel.

```css
.halftone {
  background-image: radial-gradient(var(--on-ink-faint) 1px, transparent 1px);
  background-size: 6px 6px;
  opacity: 0.16;
}
```
Used only on `--ink` grounds, never on paper. Never animated.

---

## 7. COMPONENT LIBRARY

Build every one of these in `src/ui/`. Each is a typed React component with explicit variants. **No screen may introduce a one-off styled element** — if a screen needs something new, it becomes a component here first.

Every interactive component has all six states specified: **rest, hover, focus-visible, active/pressed, disabled, loading.**

### 7.1 Button

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| `brush` | Flame brush SVG | `--on-flame`, Anton 15px | none | The one primary action per view |
| `brush-ink` | Ink brush SVG | `--paper`, Anton 15px | none | Emphasis action inside a paper card when flame is already used |
| `solid` | `--ink` | `--paper`, Anton 14px | none | Standard action on paper, radius `--r-md` |
| `outline` | transparent | `--on-paper`, Anton 14px | 2px `--ink` | Secondary action on paper, radius `--r-md` |
| `outline-light` | transparent | `--on-ink`, Anton 14px | 2px `--ink-line-2` | Secondary action on black |
| `ghost` | transparent | `--on-paper-mute`, Inter 600 13px | none | Tertiary — "Cancel", "See all" |
| `danger` | transparent | `--st-blocked`, Anton 14px | 2px `--st-blocked` | Destructive. Always opens a confirm |

- Heights: `sm` 34px · `md` 40px (desktop) / 44px (mobile) · `lg` 48px. Full-width variant for mobile card footers.
- Label is Anton uppercase with `0.03em` letter-spacing, except `ghost` which is Inter.
- **Focus-visible:** 2px `--flame` outline, 2px offset, on every variant including on paper. Never removed.
- **Loading:** label is replaced by three animated dots, the button keeps its exact width, and it becomes `aria-busy` and non-interactive.
- **Disabled:** 40% opacity, `cursor: not-allowed`, no hover response.
- **Icon buttons** are 40px circles (`--r-pill`), 1.5px border, transparent fill, icon at 18px. This is the reference's search/menu button treatment. On paper: border `--ink`. On black: border `--ink-line-2`.

### 7.2 Chip (outlined pill)

The reference's "TRADITIONAL", "FROM $230", "Flexible calendar" elements. The workhorse of this system.

- `border-radius: --r-pill` · `border: 2px solid --ink` (on paper) or `1.5px solid --ink-line-2` (on black) · background transparent · height 34px · padding `0 14px` · gap 8px between icon and label.
- Label: `label` token (Inter 600, 11px, uppercase, `0.12em`).
- Optional 16px leading sticker/icon.
- **Variants:** `static` (information), `toggle` (filter — selected state fills with `--ink` and flips text to `--paper`), `removable` (adds a 14px × at the trailing edge), `channel` (fills with the domain colour, keeps `--ink` text and border).
- Chip rows scroll horizontally on mobile with `overflow-x:auto`, `scroll-snap-type: x proximity`, and **no visible scrollbar**. Never wrap chips to a third line on mobile.

### 7.3 Tag / Badge

Smaller than a chip, non-interactive. Height 22px, `--r-xs`, `micro` type, solid fill in a domain or state colour with `--ink` text. Used for domain labels on task cards and counts on nav items.

### 7.4 StatePill

Task state indicator. Height 24px, `--r-pill`, and it carries **three** signals so it never depends on colour alone:
- an 7px filled dot in the state colour,
- the state word in `micro` uppercase,
- a distinct shape hint for the two most confusable states — `blocked` gets a 2px solid ring, `done` gets a filled background.

On paper: transparent fill, 1.5px border in the state colour, text `--on-paper`.
On black: transparent, 1.5px border, text `--on-ink`.

### 7.5 Input, Textarea

- Background `--paper-hi` on a paper card; `--ink-raised` on a black ground.
- Border `1.5px --paper-line-2`; radius `--r-sm`; height per the density table; padding `0 14px`; Inter 15px.
- **Label** sits above the field in the `label` token, `--on-paper-mute`, 6px gap. Placeholders are hints, never a replacement for the label.
- **Focus:** border becomes 2px `--flame`, plus a 3px `--flame-soft` ring. No glow, no shadow.
- **Error:** border 2px `--st-blocked`, message below in `body-sm` `--st-blocked`, field keeps focus, and the message is `role="alert"` and wired via `aria-describedby`.
- **Character-limited fields** show a right-aligned `micro` counter that turns `--st-blocked` in the last 10%.
- Textarea: min 3 rows, auto-grows to 10 rows, then scrolls.

### 7.6 Select / Dropdown — build this properly, it appears everywhere

Do **not** use a native `<select>`. Build a headless listbox (Radix UI Select or equivalent) styled as follows.

**Trigger:** identical to an Input, plus a 16px chevron at the trailing edge that rotates 180° over `--t-fast` when open.

**Panel:**
- Background `--paper`, radius `--r-md`, border `2px --ink`, `--sticker-shadow`. This is one of the few places the sticker shadow is allowed — it makes the menu feel like a physical card laid on top.
- Padding `6px`. Max-height `320px`, scrolls internally with a hidden scrollbar.
- Enters with `opacity 0→1` and `translateY(-4px)→0` over `--t-base`, `--ease-out`. Origin follows the trigger.
- Width matches the trigger; if content is wider, the panel grows right (or left near the viewport edge) — never overflows the screen.

**Option row:**
- Height 40px, radius `--r-sm`, padding `0 12px`, Inter 15px.
- Hover / keyboard-highlight: background `--paper-lo`.
- Selected: background `--ink`, text `--paper`, plus a 14px check at the trailing edge.
- Optional 18px leading icon or a domain colour dot.
- Group headers use `label` token, `--on-paper-faint`, 28px tall, non-selectable.
- A separator is 1px `--paper-line` with 4px vertical margin.

**Behaviour:** full keyboard support (↑ ↓ Home End, type-ahead, Enter selects, Escape closes and returns focus to the trigger). Multi-select shows chips inside the trigger with a `+n` overflow. Searchable variant puts a persistent search input at the top of the panel.

**Mobile (<640px):** the panel does **not** render as a dropdown. It opens as a **bottom sheet** — full width, `--r-xl` top corners, drag handle, 60% max height, options at 52px row height. This is one of the mandated mobile/desktop layout forks.

### 7.7 Menu (contextual / overflow)

Same panel styling as the Select. Triggered by a `⋯` icon button. Items may be destructive (text `--st-blocked`, and always separated from normal items by a divider). Mobile: bottom sheet, same as Select.

### 7.8 Checkbox, Radio, Switch

- **Checkbox:** 20px square, radius 6px, 2px `--ink` border, transparent. Checked: `--ink` fill with a `--paper` tick drawn as an SVG path that animates over `--t-fast`. Indeterminate: a `--paper` bar.
- **Radio:** 20px circle, 2px border. Checked: 2px border plus a 10px `--ink` centre dot.
- **Switch:** 44×26px track, `--r-pill`, 2px `--ink` border, `--paper-lo` fill. On: `--flame` fill, `--flame` border, knob slides right over `--t-base`. Knob is a 20px `--paper` circle.
- All three have a 44px minimum hit area even though the visual is 20px, and the entire label is clickable.

### 7.9 Avatar & AvatarStack

- Square with radius `--r-xs` (matching the reference's sticker-portrait feel), sizes 24 / 32 / 44px.
- Photo if present, else initials in Anton on the person's **domain channel colour** with `--ink` text. This makes a board readable at a glance.
- `AvatarStack`: up to 3 overlapping at `-8px` margin with a 2px `--paper` ring, then a `+n` chip.
- Unassigned: a dashed 2px `--paper-line-2` square with a `+` glyph.

### 7.10 TaskCard — the most-used component in the product

```
┌─────────────────────────────────────────┐  ← paper, radius --r-lg, no border
│ [DESIGN] · OCCASION · #0142             │  ← micro row; domain Tag + meta
│                                         │
│ Birthday poster — Ananya Rao (04 Sep)   │  ← Inter 600, 15px, max 2 lines
│                                         │
│ ● In progress    DUE 28 AUG      [AR]   │  ← StatePill · due · AvatarStack
└─────────────────────────────────────────┘
```
- Padding 14px mobile / 16px desktop. Internal gaps: 10px, 12px, 12px.
- **Left edge accent:** a 4px full-height bar in the domain channel colour, flush to the card's left, sharing its radius. This is how a member identifies a committee task inside their own board.
- **Overdue:** the due text turns `--st-blocked`, gains the day count (`OVERDUE 3D · 19 AUG`), and the card gains a 2px `--st-blocked` border. This is the only card that ever has a border, and that is the point.
- **Cancelled:** 45% opacity, title struck through.
- Hover: background `--paper-hi`, no lift, no shadow. Active: `--paper-lo`.
- The whole card is one button (`role="button"`, `tabIndex=0`, Enter/Space opens). The overflow `⋯` is a nested button with `stopPropagation`.
- **Compact variant** for dense lists (My Day, approval queue): single row, 56px tall, domain bar + title + state dot + due, no avatars.

### 7.11 Card, StatCard, SectionHeader

- **Card**: the anatomy in §5.2, with `surface` prop (`paper` | `mint` | `ink`).
- **StatCard**: `num-xl` Anton number, `label` caption beneath, optional 7-point sparkline drawn as an inline SVG polyline (1.5px, `--on-paper`, with a 3px filled endpoint dot), optional delta chip. On a paper card. Four across on desktop, 2×2 grid on mobile — **never a horizontal scroll of stat cards.**
- **SectionHeader**: `display-4` Anton uppercase on the left, optional `ghost` action on the right, 1px `--ink-line` rule beneath, 24px above / 12px below. On a black ground it uses `--on-ink`.

### 7.12 Table (desktop) → CardList (mobile) — mandated fork

- **Desktop:** a real table on a paper card. Header row: `label` token, `--on-paper-mute`, `--paper-lo` background, 38px tall, sticky on scroll. Body rows 44px, 1px `--paper-line` between, hover `--paper-hi`. Numeric columns right-aligned and tabular. Row actions appear on hover at the trailing edge.
- **Mobile:** the same data renders as a stack of compact cards, **not** a horizontally scrolling table. Each card shows the two most important fields prominently and the rest as `label: value` rows. Build this as one `<DataView>` component that picks its own rendering by breakpoint, so a screen author never has to write both.

### 7.13 Tabs & SegmentedControl

- **Tabs:** Anton uppercase 14px, 40px tall, 2px `--flame` underline on the active tab, `--on-paper-mute` when inactive. Overflow scrolls horizontally with fade masks at the edges.
- **SegmentedControl:** a pill container, 2px `--ink` border, 4px padding; the active segment is a filled `--ink` pill with `--paper` text and slides over `--t-base`. Use for 2–3 mutually exclusive views (e.g. Board / List / Calendar).

### 7.14 Modal, Sheet, Drawer

| Component | Where | Spec |
|---|---|---|
| **Modal** | Desktop, ≥640px | Centred, max-width 560px, `--paper`, `--r-xl`, no shadow (the scrim provides separation). Scrim `rgba(11,11,11,0.72)`. Enters: scale `0.97→1` + fade, `--t-base`. Escape closes unless the form is dirty, in which case confirm |
| **Sheet** | Mobile, <640px | Bottom sheet, full width, `--r-xl` top corners only, 4px × 36px `--paper-line-2` drag handle, max-height 88vh, drag-to-dismiss with a 120px threshold. **Every modal automatically becomes a sheet below 640px** |
| **Drawer** | Desktop | 480px from the right for task detail. The board stays visible and interactive behind it. Enters `translateX(24px)→0` + fade. Closes on Escape, on scrim click, and on a persistent ✕ |

All three trap focus, restore focus to the trigger on close, set `aria-modal`, and lock body scroll.

### 7.15 Toast

Bottom-centre on mobile (above the nav bar), bottom-right on desktop. `--paper` card, `--r-md`, `--sticker-shadow`, max-width 380px. A 4px left bar in the semantic colour. Body in `body-sm`. Auto-dismisses at 4s with a thin `--flame` progress line; errors persist until dismissed. Optional single `ghost` action ("Undo"). Stacks to a maximum of 3, oldest dropped. `aria-live="polite"`, or `assertive` for errors.

### 7.16 EmptyState

The place this design system gets to be charming, so make them good.

```
        [ Sticker, 96px ]
      NOTHING DUE TODAY          ← display-3 Anton
   "you're clear — go make something"   ← Instrument Serif italic, --on-paper-mute
        [ outline button ]        ← optional, one action only
```
Centred on a paper card, 40px vertical padding, max-width 320px. Every empty state in §9 has its own sticker and its own written line — **never a generic "No data".**

### 7.17 Skeleton & Loading

Paper-coloured blocks at `--paper-lo`, matching the exact shape of what is loading (a task card skeleton looks like a task card). A slow 1.4s opacity pulse between 1 and 0.6 — **no shimmer sweep.** Never a spinner anywhere in the product. Buttons use the three-dot label instead.

### 7.18 Nav — the layout fork

- **Desktop (≥1024px):** persistent left rail, `--nav-rail` wide, `--ink-raised`, 1px `--ink-line` right edge. Logo lockup at the top (56px zone). Items are 44px tall, `--r-md`, Anton 14px uppercase, `--on-ink-mute`. Active: `--paper` background, `--ink` text, and a 4px `--flame` bar on the left edge. Count badges right-aligned. The rail collapses to a 68px icon-only strip below 1200px.
- **Mobile (<1024px):** bottom bar, `--nav-bottom` tall, `--ink-raised`, 1px `--ink-line` top edge, safe-area inset padding. **Exactly 5 items, never 6.** Icon 22px above a `micro` label. Active item: icon and label in `--flame`. The 5th item is always "More", opening a sheet with the remaining destinations.
- **Header:** 58px, sticky, `--ink`. Left: back chevron or logo. Centre: screen title in Anton 15px uppercase. Right: search and overflow icon buttons. It hides on scroll-down and reappears on scroll-up on mobile.

### 7.19 Everything else

`Accordion` (44px trigger row, chevron rotates, content animates height over `--t-base`) · `Tooltip` (desktop only — `--ink` fill, `--paper` text, `micro`, `--r-xs`, 8px offset, 400ms delay; **never** used to hold information a mobile user needs) · `Popover` (Select panel styling) · `DatePicker` (paper panel; today outlined 2px `--ink`, selected filled `--ink`, range fills `--flame-soft`; mobile opens as a sheet) · `ProgressBar` (8px, `--r-pill`, `--paper-lo` track, `--ink` fill; `--flame` only when it represents something at risk) · `Breadcrumb` (`label` token, `/` separators, collapses to "… / current" on mobile) · `SearchBar` (pill input, 18px leading icon, clear ✕, ⌘K on desktop) · `LinkChip` (deliverable links — provider icon + truncated label + external-link glyph, chip styling, opens in a new tab) · `CommentItem` · `ActivityRow` · `NotificationItem` · `PermissionRow` · `Pagination` (chips, not arrows).

---

## 8. RESPONSIVE — WHERE MOBILE AND DESKTOP DELIBERATELY DIVERGE

Breakpoints: `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`.

Most of the app is one responsive layout. These **nine features fork** — build genuinely different components, not a squashed desktop layout. Each fork is listed as `mobile → desktop`.

| # | Feature | Mobile (<1024) | Desktop (≥1024) |
|---|---|---|---|
| 1 | **Navigation** | Bottom bar, 5 items + More sheet | Left rail, full item list, collapsible |
| 2 | **Board** | Vertical list grouped by state, collapsible group headers with counts; state changed via a bottom sheet | Full Kanban, 4–5 columns, horizontal scroll, drag-and-drop |
| 3 | **Task detail** | Full-screen route with a back chevron | 480px right drawer; board stays live behind it |
| 4 | **Select / Menu / DatePicker** | Bottom sheet, 52px rows | Anchored dropdown panel, 40px rows |
| 5 | **Tables** | Stack of compact cards | Real table with sticky header |
| 6 | **Calendar** | Agenda list grouped by day, "jump to date" chip row | Month grid with day cells and layer toggles |
| 7 | **Insights** | Single column; stat cards 2×2; charts full-width, 180px tall | 12-column grid; stat cards 4-across; charts 280px tall |
| 8 | **Permissions screen** | Two-step flow: pick a member → edit their permissions (full-screen, grouped accordions) | Two-pane: member list left (280px), permission groups right, live preview panel pinned bottom-right |
| 9 | **Modal** | Bottom sheet, drag to dismiss | Centred modal |

**Rules that apply to all forks:**
- Both versions must expose the same actions. A mobile user must never be missing a capability a desktop user has.
- Never use `display:none` to hide desktop markup on mobile — render only what that breakpoint needs, so the DOM stays light on phones.
- Test every screen at exactly **375px, 768px, 1024px and 1440px** before calling it done.
- Support `env(safe-area-inset-*)` on every fixed element.
- Touch targets: 44px minimum on mobile, 36px acceptable on desktop pointer devices.

---

## 9. SCREEN SPECIFICATIONS

Build every screen listed. For each, the sections below give: purpose · layout · components · empty state · loading state · error state. Where mobile and desktop differ, both are described.

### 9.1 Login — `/login`

The first impression, and the screen that has to say "this is INOVX's own thing".

**Layout (both breakpoints, centred, max-width 420px):**
1. Full-bleed `--ink` ground with the `.halftone` texture at 16% behind the top third.
2. Logo image in its black chip, 120px wide, centred, 40px from the top of the content block.
3. `display-1` headline in `--on-ink`: **"INOVX OPS"**. Below it, one line of Instrument Serif italic in `--on-ink-mute`: *"the club's own system"*.
4. A `--paper` card, `--r-xl`, padding 24px, containing: Email input, Password input, a `ghost` "Forgot password" right-aligned, and a full-width `brush` primary button labelled **"SIGN IN"**.
5. Beneath the card, `label` token in `--on-ink-faint`, centred: **"INTERNAL SYSTEM · ACCOUNTS ARE ISSUED BY THE CORE TEAM"**.
6. One `StickerLock` at 132px, bottom-right, 12% opacity, partially cropped by the viewport edge. Decorative.

**Error:** one message for a wrong email and a wrong password alike — *"Check your email and password."* Never reveal which half was wrong. After 5 failures: *"Locked for 15 minutes."* The message appears inside the card above the button, in `--st-blocked` on a `--flame-soft` block.

**Loading:** the button shows the three-dot state. Nothing else moves.

**No signup link exists anywhere on this screen or in the app.**

### 9.2 First run — `/first-run`

Reached immediately after the first login and unavoidable until completed. Same visual frame as login.
- `display-2`: **"SET YOUR PASSWORD"**.
- One paper card: new password, confirm password, a live requirement checklist (10+ characters; not a common password) where each item flips from an outline circle to a filled `--st-done` tick as it passes.
- Primary `brush` button: **"CONTINUE"**, disabled until valid.
- No navigation, no back, no escape. The nav chrome is not rendered on this route at all.

### 9.3 Onboarding tour — `/welcome`

Four full-screen cards, swipeable on mobile, arrow-navigable on desktop. Each: a 132px sticker, a `display-2` headline, two lines of `body-lg`, and a dot indicator. Slides: **YOUR BOARD** · **FINISH A TASK** · **GET NOTIFIED** · **INSTALL THE APP**. The fourth slide's primary action is the install card (§9.16). A `ghost` "Skip" sits top-right throughout.

### 9.4 My Day — `/my-day` — member landing

**Purpose:** answer "what do I owe today" in under three seconds, without scrolling on a phone.

**Above the fold on a 375px screen:** the greeting strip and the first two content cards. This is a hard requirement.

**Blocks in order:**
1. **Greeting strip** — on `--ink`, not a card. `display-3` "GOOD MORNING, RIYA" and beneath it a `body-sm` line: *"3 due today · 1 overdue · 2 awaiting review"*, with the overdue count in `--st-blocked`.
2. **Overdue card** (only rendered if any) — `--paper` card, tape decoration top-right, `display-4` "OVERDUE", then compact TaskCards.
3. **Due today** — `--paper` card, compact TaskCards.
4. **Awaiting your approval** (only if the person has the permission) — `--mint` card, count chip in the header.
5. **In review** — the person's own submitted work, compact rows with a "waiting Nd" micro label.
6. **Next 7 days** — `--paper` card, collapsed by default to 3 rows with a "SEE ALL" ghost action.
7. **Occasions** — `--mint` card, "TODAY'S BIRTHDAYS" with avatar + name rows.
8. **Pinned announcements** — `--paper` card with a pin sticker.

**Interactions:** tap a card to open the task · swipe right on a compact row advances its state one step with an undo toast · long-press opens the state sheet.
**Data:** one `GET /me/day` request. Never six.
**Empty:** `StickerCoffee`, "NOTHING DUE TODAY", *"you're clear — check the board for what's coming"*.
**Loading:** greeting strip renders instantly from cached `/me`; three task-card skeletons below.

### 9.5 Command Deck — `/deck` — admin & super-admin landing

**Mobile:** single column — stat cards 2×2, then domain strips, then approvals, then attention list.
**Desktop:** 12-column grid — stat row across the top, then a 8/4 split with domain strips left and the approval queue right.

1. **Stat row** — four StatCards: OPEN · OVERDUE · AWAITING APPROVAL · DONE THIS WEEK. Each with a 7-point sparkline. The overdue tile gains a 2px `--st-blocked` border above threshold.
2. **Domain strips** — five rows, each a `--paper` card 64px tall: a 6px left bar in the domain colour, the domain name in Anton, open/overdue counts, and a ProgressBar. Tapping enters that board.
3. **Approval queue** — compact rows, oldest first, with a "waiting Nd" chip that turns `--st-blocked` past 3 days. Inline **APPROVE** (`solid`) and **CHANGES** (`outline`) buttons on each row at desktop; on mobile the row opens a sheet with the same two actions.
4. **Attention list** — a `--mint` card: blocked tasks, unassigned occasion tasks, degraded integrations, members with zero open tasks. Each row is a chip-led line with a one-tap resolution.
5. **Committees & occasions** — two side-by-side cards on desktop, stacked on mobile.

### 9.6 Oversight Deck — `/oversight` — faculty landing

Read-only. **Every mutating control is absent from the DOM, not disabled.**
- A `--paper` hero card with a plain-language summary written as sentences, not metrics: *"The club completed 38 of 46 tasks this fortnight. Design and Events are on track. Three tasks in Management are overdue."*
- A 12-week activity chart, 280px desktop / 180px mobile.
- A per-domain completion table (DataView — table on desktop, cards on mobile).
- Upcoming events and occasions.
- Recently published minutes.
- Attendance summary.
- An `outline` "EXPORT CSV" button, only if the permission is held.

### 9.7 Board — `/board/[slug]` and `/committee/[id]`

**Header (both):** `display-2` domain name, a 4px underline in the domain channel colour, a member-count chip, a SearchBar, a filter chip row, and — on desktop only — the visibility Select for those who may change it.

**Desktop:** Kanban. Columns TO DO · IN PROGRESS · IN REVIEW · DONE, with BLOCKED appearing only when occupied. Column header: Anton uppercase + count chip, 2px underline in the state colour. Min column width 300px, horizontal scroll beyond four. Drag-and-drop with a 2px dashed `--flame` drop indicator. DONE is collapsed to the last 7 days with an expander.

**Mobile:** vertical grouped list. Sticky group headers (state name + count) that collapse. TaskCards at compact density. State changes through a bottom sheet listing legal transitions only — illegal transitions are not rendered, not greyed out.

**Realtime:** another person's change animates in over `--t-base` with a single 400ms `--flame-soft` flash on the card.
**Empty:** `StickerClipboard`, "NO ACTIVE TASKS", *"nothing has been assigned to this board yet"*.

### 9.8 Task detail — `/task/[id]`

Drawer on desktop, full-screen route on mobile.

- **Header:** breadcrumb (`Domain / Board`), short id in `micro`, StatePill, and a `⋯` overflow menu.
- **Title:** `display-3` Anton if short, Inter 600 20px if longer than 6 words. Inline-editable for those permitted — click turns it into an input in place, Escape cancels, blur or Enter saves.
- **Body card** (`--paper`): description, then a metadata block of `label: value` rows — Assignees (AvatarStack + add), Due (DatePicker), Priority (Select), Labels (removable chips + add), Source (a chip linking to the recurring rule or occasion if generated).
- **Checklist card:** rows with checkbox, text, and a ProgressBar header showing `3/7`.
- **Deliverables card** (`--mint`): LinkChips. The "add link" flow shows the reminder line *"Make sure sharing is set to anyone-with-the-link — reviewers can't open a restricted file."* as `body-sm` beneath the input. Unverifiable links carry a small warning glyph, not an error.
- **Tabs:** ACTIVITY | COMMENTS. Activity is the default for admins, Comments for members.
- **Action bar:** sticky at the bottom. **Exactly one primary action**, computed from state and permission — START · SUBMIT FOR REVIEW · APPROVE · REQUEST CHANGES · MARK DONE. Secondary actions go in the overflow.
- **Chained task:** if generated from another task, a `--mint` strip at the top links back: *"Generated from #0142 — Design"*.

### 9.9 Calendar — `/calendar`

- **Desktop:** month grid on a `--paper` card. Day cells 96px tall, today outlined 2px `--ink`, weekend cells `--paper-lo`. Up to 3 event chips per cell then "+n more". A layer chip row toggles Deadlines / Occasions / Meetings / Events.
- **Mobile:** agenda list grouped by day with sticky date headers, plus a horizontally scrolling week strip at the top for jumping.
- **Occasion rows** show their generated poster tasks and each one's state inline — this is the screen the Design lead lives in.

### 9.10 People — `/people`

- Search + domain filter chips.
- **Desktop:** a 3-column grid of member cards — 44px avatar, name in Anton, position title, domain Tag, committee count, and (for those with analytics permission) an open-task count.
- **Mobile:** a compact list at 56px rows.
- A **BIRTHDAYS** tab shows the next 60 days as date-grouped rows, each linking to that member's card on the existing member-cards site and to any generated poster task.

### 9.11 Meetings — `/meetings`, `/meetings/[id]`

List by context with date, title, attendee count and a published/draft Tag. Detail: an attendance grid (avatar + name + a three-way SegmentedControl for Present/Absent/Excused, bulk "mark all present"), a minutes editor, and an action-items block where each item has a one-tap **"MAKE A TASK"** `outline` button that opens a pre-filled task sheet.

### 9.12 Insights — `/insights`

Stat row, a 12-week activity chart, a per-domain completion chart, a workload-by-member bar chart, and the leaderboard.

**Charts:** drawn as inline SVG or a light chart library. Rules — 1.5px lines, no gradients, no 3D, no drop shadows. Series colours come from the domain channel tokens. Grid lines are 1px `--paper-line`. Axis labels use the `label` token. Every series is distinguishable without colour (line style or a direct end label). Tooltips are desktop-only; mobile uses tap-to-pin a value label.

**Leaderboard:** visible only with `leaderboard.view` (core team + faculty). Rank 1 gets a `--flame` Tag; ranks 2–3 get `--ink` Tags. Show a maximum of 10 rows.

### 9.13 Notifications — `/notifications`

Grouped TODAY / EARLIER. Each row: a 32px sticker or avatar, the message in `body-sm` with the actor's name in Inter 600, a `micro` timestamp, and an unread indicator (a 7px `--flame` dot at the leading edge). Unread rows sit on `--paper-hi`. A "MARK ALL READ" `ghost` action in the header. Tapping deep-links to the entity.

### 9.14 Settings — `/settings`

Accordion sections: **Profile** (name, email read-only, avatar, position) · **Notifications** (a matrix of event type × In-app / Push / Email using switches; on mobile it becomes a per-event accordion, never a horizontally scrolling grid) · **Install the app** (§9.16) · **About** (version, tenure, a link to the build docs) · **Sign out** (a `danger` button at the bottom, with a confirm).

### 9.15 Admin screens — `/admin/*`

All eight share a frame: `display-2` title, a one-line `body-sm` description, and content on paper cards. Each is individually permission-gated and simply does not appear in navigation without its key.

- **Members** — DataView of all members with a `brush` "ADD MEMBER" primary and an `outline` "IMPORT CSV". The provisioning form is a sheet/modal. After creation, a result card shows the temporary password with a **COPY** button and a warning that it is shown once.
- **Permissions** — see §9.17.
- **Occasions** — calendar list with type chips, an outputs sub-panel per occasion (which domain, lead time, assignment strategy), and a **lunar-date confirmation queue** shown as a `--mint` banner card at the top when any occasion needs this year's date.
- **Recurring** — the rule builder, with a live "next 5 occurrences" preview panel that updates as the frequency changes.
- **Approvals** — the full queue with bulk selection and a sticky action bar when rows are selected.
- **Integrations** — a sync status card (green/amber/red bar), last-sync timestamp, a run-now `outline` button, a manual CSV upload, and a conflicts list.
- **Archive** — tenure cards, an export button, and the handover wizard as a 3-step Stepper.
- **Audit** — a filterable DataView; on mobile each entry is a card with actor, action and timestamp.

### 9.16 Install card

Appears in onboarding, in Settings, and as a dismissible banner weekly (max 3 times).
- Platform-aware. **iOS Safari:** three numbered steps with small illustrations — tap Share → Add to Home Screen → open from the home screen — plus the honest line *"Apple doesn't allow an install button. This is the only way to get notifications on iPhone."* **Android/Chrome:** a single `brush` "INSTALL" button wired to `beforeinstallprompt`. **Desktop:** points at the address-bar install icon.
- If dismissed, a `body-sm` line confirms: *"No problem — we'll email you instead."*

### 9.17 Permissions screen — spec this carefully

The screen the President uses most, and the easiest one to build badly.

- **Desktop:** two panes. Left (280px): searchable member list with role Tags. Right: permission groups as accordions (Tasks, Committees, Members, Analytics, Admin). Each row shows the permission's plain-English name, the role default as a `micro` note, and a three-state SegmentedControl — **INHERIT / GRANT / REVOKE**. When a granted permission supports scoping, a domain multi-select Chip row appears beneath it.
- **Pinned preview panel**, bottom-right of the right pane, `--mint`, always visible: *"Riya will be able to: view all boards · approve completions · manage recurring rules in Design."* It updates live as controls change.
- **Sticky save bar** appears the moment anything is dirty: "3 changes" + `ghost` DISCARD + `brush` SAVE. Save is atomic, writes one audit entry, and fires a toast.
- A `danger` "RESET TO ROLE DEFAULT" for the whole person sits at the bottom, behind a confirm.
- **Mobile:** a two-step flow — a member list screen, then a full-screen permission editor for that person with the same accordions, the preview as a fixed bottom card, and the save bar above the nav.

### 9.18 System screens

- **404** — `StickerCloudOff`, `display-2` "NOTHING HERE", *"this page doesn't exist, or you don't have access to it"*, and a `brush` "BACK TO MY DAY".
- **403** — `StickerLock`, "NOT YOUR BOARD", *"ask a super admin if you need access"*.
- **500** — `display-2` "SOMETHING BROKE", the request id in `micro` for reporting, and a "TRY AGAIN" button.
- **Offline banner** — a fixed strip below the header: `--ink-raised`, `--on-ink-mute`, *"Offline — showing last synced 14:02. Changes will send when you reconnect."*
- **Update available** — a toast: *"A new version is ready."* + RELOAD.

---

## 10. MOTION

| Motion | Duration | Easing | Where |
|---|---|---|---|
| Press feedback | 90ms | linear | Buttons, chips, checkboxes — scale to 0.97 |
| State change | 160ms | `--ease` | Task moving column, pill colour, tab underline |
| Panel enter | 160ms | `--ease-out` | Dropdown, popover, tooltip |
| Sheet / drawer | 260ms | `--ease-out` | Bottom sheet, right drawer |
| Page transition | 200ms | `--ease-out` | Route change — fade + 8px rise. Nothing slides horizontally |
| Skeleton pulse | 1400ms | ease-in-out, infinite | The only looping animation in the product |

- Nothing else loops. No ambient movement, no pulsing borders, no auto-playing anything.
- Lists stagger their children by **20ms each, capped at 6 items**, then render the rest at once.
- `prefers-reduced-motion: reduce` disables every transform and transition; opacity fades of ≤100ms may remain. This is a hard requirement, checked in review.

---

## 11. ACCESSIBILITY — REQUIRED, NOT ASPIRATIONAL

- **Contrast:** `--on-paper` on `--paper` is ~16:1. `--on-paper-mute` on `--paper` passes AA for body text; `--on-paper-faint` is for decorative use only and never for text a person must read. `--flame` on `--paper` is ~3.6:1 — **it may be used for large text (18px+ bold), icons and borders, never for body copy.** White on `--flame` passes for button labels. Verify every pairing before shipping it.
- Every state, priority and domain is communicated by **text or shape in addition to colour**.
- Focus-visible is a 2px `--flame` outline at 2px offset on every interactive element, including task cards and table rows. It is never removed.
- Full keyboard operation. The board is a listbox: arrow keys move between cards, Enter opens, `Ctrl/Cmd+→` advances state.
- Every icon-only button has an `aria-label`. Every input has a real `<label>`.
- Dialogs trap focus, set `aria-modal`, and return focus to their trigger.
- Live regions: toasts `polite`, errors `assertive`, board updates `polite`.
- Headings are hierarchical — one `h1` per screen, no level skipped. Anton's uppercase styling comes from CSS, never from typing in caps, so screen readers read words rather than letters.
- Test at 200% browser zoom, and with the OS at its largest text size.

---

## 12. FRONTEND STRUCTURE

```
src/
├─ styles/
│  ├─ tokens.css          # §3 — the single source of truth
│  └─ base.css            # reset, font faces, body ground, focus ring
├─ ui/
│  ├─ primitives/         # Button IconButton Chip Tag StatePill Input Textarea
│  │                      # Select Menu Checkbox Radio Switch Avatar AvatarStack
│  │                      # ProgressBar Skeleton Tooltip Popover DatePicker
│  ├─ patterns/           # Card StatCard TaskCard BoardColumn DataView Table
│  │                      # Tabs SegmentedControl Modal Sheet Drawer Toast
│  │                      # EmptyState SectionHeader SearchBar FilterBar LinkChip
│  │                      # CommentItem ActivityRow NotificationItem PermissionRow
│  ├─ signature/          # BrushStroke Tape Pin Halftone
│  ├─ stickers/           # the nine SVG sticker components
│  └─ nav/                # NavRail BottomBar Header MoreSheet
├─ screens/               # one folder per §9 screen
├─ hooks/                 # useBreakpoint useToast usePermission useOptimistic
└─ lib/                   # http client, error mapping, date formatting, cn()
```

**Rules:**
- `useBreakpoint()` is the only place `window.matchMedia` is read. Every fork in §8 goes through it.
- `usePermission('task.assign')` is the only way the UI decides whether to render a control. **The UI hides things as a courtesy; the server decides. Never treat a hidden control as security.**
- No component reads a colour, size or duration except from a token.
- Every component file exports one component and its prop type. Co-locate a `.stories` or a usage example.

---

## 13. BUILD ORDER — DO NOT SKIP AHEAD

**Phase 1 — Foundation (build and show me this before anything else)**
Tokens, base styles, fonts, the logo assets, `BrushStroke`, and a `/kitchen-sink` route rendering every primitive in every state and variant on both a paper and an ink ground. I will review this route before you build a single screen.

**Phase 2 — Shell**
NavRail, BottomBar, Header, MoreSheet, page transitions, the offline banner, the four system screens, and routing with the role-based landing redirect.

**Phase 3 — Entry**
Login, First run, Onboarding tour, Install card.

**Phase 4 — Core**
My Day, Board (both forks), Task detail (both forks), TaskCard in all variants.

**Phase 5 — Decks**
Command Deck, Oversight Deck, Insights, charts.

**Phase 6 — The rest**
Calendar, People, Meetings, Notifications, Settings.

**Phase 7 — Admin**
All eight admin screens, with Permissions last because it is the hardest.

**Phase 8 — Polish**
PWA manifest and service worker, empty and loading states everywhere, the accessibility pass, the responsive pass at all four widths, and the reduced-motion pass.

---

## 14. ACCEPTANCE CHECKLIST — A SCREEN IS NOT DONE UNTIL ALL 16 ARE TRUE

1. Renders correctly at 375, 768, 1024 and 1440px.
2. Passes the four compactness tests in §5.4.
3. Uses only tokens — no raw hex, no magic pixel values, `grep` clean.
4. Uses only Anton, Inter and Instrument Serif.
5. Has a designed loading state (skeletons, no spinner).
6. Has a designed empty state with its own sticker and its own written line.
7. Has a designed error state using the standard error envelope.
8. Has exactly one primary (brush) action in view — or none.
9. Every interactive element has a visible focus ring.
10. Fully keyboard operable; dialogs trap and restore focus.
11. No information conveyed by colour alone.
12. Respects `prefers-reduced-motion`.
13. Permission-gated controls are absent from the DOM, not disabled.
14. Card stacks alternate paper/mint correctly and never nest more than two deep.
15. Touch targets are 44px+ on mobile.
16. No banned pattern from §1.2 appears anywhere in the diff.

---

## 15. WHEN YOU ARE UNSURE

Ask before inventing. If a screen seems to need a component that is not in §7, propose it with a one-paragraph rationale rather than styling something inline. If two rules in this document conflict, the more specific one wins; if they are equally specific, ask.

**Build Phase 1 now, and stop at the `/kitchen-sink` route for review.**
