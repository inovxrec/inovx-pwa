# INOVX84 — Frontend

Vite + React + TypeScript. No Tailwind — plain CSS files per component using
the design tokens in `src/styles/tokens.css`, same approach as the original
HTML prototype.

## Run it

```
npm install
npm run dev
```

Login with one of the fake accounts (real auth isn't wired yet):

| Email | Password | Role |
|---|---|---|
| riya@inovx.club | demo | admin |
| member@inovx.club | demo | member |
| faculty@inovx.club | demo | faculty |



## Rules for building your screen

1. **Don't touch `src/styles/tokens.css`, `src/components/`, or `src/layouts/`** without flagging it in the group chat first — everyone imports from these.
2. Pull shared UI from `src/components/` (`<Button variant="primary">`, `<Panel bracket>`, `<Pill status="progress">`, `<Avatar initials="RS">`) instead of writing your own button/card markup.
3. Need to show a toast? `const { toast } = useToast(); toast('MOVED — IN PROGRESS');`
4. Need a delete/cancel confirmation? Use `<Modal>` — no destructive action should fire directly off one click, per the build doc.
5. Your screen just needs to return JSX for the content area — `AppShell` already handles the nav rail / bottom bar / topbar / title for you. You don't need to touch layout files.
6. If a screen needs a new domain accent color (e.g. Board should render in `--chan-design`), set it as an inline CSS var on your screen's root div: `style={{ '--chan': 'var(--chan-design)' }}`.
7. Mobile: don't build separate mobile components. Add `@media (max-width: 720px)` rules to your own CSS file — the shell already switches nav-rail → bottom-bar at that breakpoint automatically.

## Reference

The original static HTML prototype (`inovx84-screens.html`) is the source of truth for exact markup/copy per screen — copy structure and classnames from it, just split into components.
