# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small static, no-build web app ("painel-cofco") for COFCO INTL equipment maintenance dashboards, covering two plants/units (Sebastianópolis and Meridiano). There is no package.json, bundler, or test suite — every page is a single self-contained `.html` file with inline `<style>` and `<script>`, opened directly in the browser or served as static files. Auth and all data storage are provided by Supabase — the dashboard has no data of its own left in the browser (see "Dashboard page" below).

## Running / developing

There is no build step. To work on a page, open the `.html` file directly in a browser or serve the folder with any static file server (e.g. `python -m http.server`). Changes are visible on reload — no compile/watch process exists.

There are no lint or test commands configured in this repo.

## Architecture

**Auth flow (Supabase):**
- `config.js` initializes the shared `supabaseClient` (Supabase URL + publishable key), defines `ADMIN_EMAIL` (the one account allowed to manage user→unit assignments), `UNIT_LABELS` (unit id → display name), and `UNIT_PAGES` (maps a profile's `unit` value to the dashboard URL that unit should land on, e.g. `painel.html?unit=meridiano`). Every other page `<script src="config.js">`s this file to get these.
- `index.html` — login/forgot-password/set-password page. On successful auth redirects to `app.html`.
- `app.html` — post-login router. Reads the user's Supabase session; if the email matches `ADMIN_EMAIL` redirects to `admin.html`; otherwise looks up the user's `unit` from the `profiles` table and redirects to the matching URL in `UNIT_PAGES` (or shows a "waiting for access" message if no unit is assigned).
- `admin.html` — admin-only screen (gated by `ADMIN_EMAIL`) listing all rows in the `profiles` table (email, unit) and letting the admin assign/change each user's unit via a `<select>` that updates `profiles.unit` directly through the Supabase client. It also links to `painel.html?unit=sebastianopolis` / `?unit=meridiano` to open either dashboard directly. New users are provisioned by inviting them from the Supabase dashboard (not from this app); they then appear here automatically.
- `painel.html` re-checks the session on load and resolves which unit's data to show (see below), redirecting non-matching/unassigned users back to `app.html`. `ADMIN_EMAIL` bypasses the unit check.

**Dashboard page (`painel.html`):**
- One file serves both units (there used to be a separate `painel_meridiano.html` near-duplicate; it was merged in). The active unit is resolved once, early in the page's auth script, into `window.ACTIVE_UNIT`, exposed via the `window.authReady` promise that every other script block awaits before touching data:
  - Regular users always get their own `profiles.unit` — the `?unit=` URL param is ignored for them.
  - The admin account picks the unit via `?unit=sebastianopolis` / `?unit=meridiano` in the URL (defaults to `sebastianopolis` if missing/invalid).
  - The read-only "visualização" export (see below) carries its unit inside its embedded data instead of the URL.
- Each page is a full maintenance-order (OS) dashboard with four tabs: Visão Geral (KPIs + charts), Lista OS (sortable/filterable table), Acompanhamento (workflow/stage tracking with a kanban-like stage picker and priority buttons), and Médias (averages).
- The OS list comes from an uploaded `.xlsx` workbook (or an automatic periodic fetch from a shared Google Drive CSV export, filtered client-side by unit), parsed client-side with a vendored, trimmed-down copy of SheetJS (inlined in a `<script>` block, "SheetJS mini" — search for `SheetJS mini` to find it).
- **All persisted state is in Supabase, scoped by unit, not the browser.** Four tables back the four things that used to live in `localStorage`: `maintenance_orders` (the parsed OS list, replaced wholesale on each upload/fetch), `acomp_rows` (the hand-edited tracking rows — this is the real "user edits" data: stage, priority, doc/resp/prazo/obs, add/delete), `upload_history` (the daily snapshot log behind the Médias evolution chart), and `unit_state` (small metadata like the last-upload reference label). Row Level Security on all four scopes access to users whose `profiles.unit` matches the row's `unit` (plus `ADMIN_EMAIL`, unrestricted) — see the `current_unit()`/`is_admin()` helper functions in the database. Every mutation in the page (stage clicks, priority buttons, inline field edits, add/edit/delete equipment, CSV/Excel imports) writes through one of the `persist*` helper functions near the top of the main `<script>` block instead of a bulk `saveAll()`.
- **Changes are shared live.** `setupRealtime()` opens a Supabase Realtime channel per unit and re-renders the affected view whenever any of the four tables changes — so if one person changes a stage or uploads a new CSV, everyone else with that unit's dashboard open sees it without reloading. This does not run in the read-only export mode.
- A "Gerar visualização" export (`gerarPainelLeitura`) clones the live page and embeds a frozen snapshot of the current data (plus the active unit) as JSON in a downloadable standalone `.html` file — opening it sets `window.MODO_LEITURA`/`window.DADOS_EMBUTIDOS`, which makes the page read from that embedded snapshot instead of Supabase and hides all editing controls via the `body.leitura` CSS class. Opening it still requires being logged in as that unit (or as admin) — it skips the *data* backend, not auth.

## Working with the user

The user who owns this repo is **not a developer**. They do not know shell/CLI commands, git, GitHub, databases, or general programming concepts, and should never be expected to run commands, resolve merge conflicts, or interpret technical error messages themselves.

- Explain things in plain, non-technical language. Avoid jargon; when a technical term is unavoidable, briefly say what it means in practical terms.
- Don't ask the user to run terminal/git commands, edit files by hand, or use the Supabase dashboard's SQL editor — do it yourself.
- After making any code change, always commit and push it to git (`origin`, current branch) yourself, without asking for confirmation first. The user relies on this happening automatically since they cannot do it themselves. Write a clear, plain-language commit message describing what changed and why.
- If something requires a decision only the user can make (e.g. which unit a dashboard is for, wording of on-screen text), ask in plain terms and offer concrete options rather than technical ones.

## Conventions to preserve

- UI copy is in Brazilian Portuguese (`pt-br`/`pt-BR`); keep new user-facing text consistent with that.
- Pages share a hand-rolled CSS custom-property theme (`--bg`, `--s1`, `--accent`, etc.) rather than a framework; `index.html`/`app.html`/`admin.html` use a light/dark `color-scheme` themed palette, while `painel.html` uses a fixed dark theme.
- `config.js` intentionally only exposes the Supabase *publishable* key — never add the `service_role` secret key to any client-side file.
- Don't reintroduce a second dashboard file for a unit-specific tweak — add it to the `UNITS`-style config/constants in `painel.html` instead (e.g. `UNIT_FILTER_MAP`), so the file stays single-source.
