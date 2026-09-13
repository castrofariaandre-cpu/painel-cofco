# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small static, no-build web app ("painel-cofco") for COFCO INTL equipment maintenance dashboards. There is no package.json, bundler, or test suite — every page is a single self-contained `.html` file with inline `<style>` and `<script>`, opened directly in the browser or served as static files. Auth and data storage are provided by Supabase.

## Running / developing

There is no build step. To work on a page, open the `.html` file directly in a browser or serve the folder with any static file server (e.g. `python -m http.server`). Changes are visible on reload — no compile/watch process exists.

There are no lint or test commands configured in this repo.

## Architecture

**Auth flow (Supabase):**
- `config.js` initializes the shared `supabaseClient` (Supabase URL + publishable key), defines `ADMIN_EMAIL` (the one account allowed to manage user→unit assignments), and `UNIT_PAGES` (maps a profile's `unit` value to the dashboard file that unit should land on). Every other page `<script src="config.js">`s this file to get `supabaseClient`, `ADMIN_EMAIL`, and `UNIT_PAGES`.
- `index.html` — login/forgot-password/set-password page. On successful auth redirects to `app.html`.
- `app.html` — post-login router. Reads the user's Supabase session; if the email matches `ADMIN_EMAIL` redirects to `admin.html`; otherwise looks up the user's `unit` from the `profiles` table and redirects to the matching page in `UNIT_PAGES` (or shows a "waiting for access" message if no unit is assigned).
- `admin.html` — admin-only screen (gated by `ADMIN_EMAIL`) listing all rows in the `profiles` table (email, unit) and letting the admin assign/change each user's unit via a `<select>` that updates `profiles.unit` directly through the Supabase client. New users are provisioned by inviting them from the Supabase dashboard (not from this app); they then appear here automatically.
- Each dashboard page (`painel.html`, `painel_meridiano.html`) also independently re-checks the session on load and enforces its own `EXPECTED_UNIT`, redirecting non-matching users back to `app.html`. `ADMIN_EMAIL` bypasses the unit check on every dashboard.

**Dashboard pages (`painel.html`, `painel_meridiano.html`):**
- These two files are near-duplicates — one per plant/unit (Sebastianópolis vs. Meridiano). Diffs between them are limited to unit-specific constants: `EXPECTED_UNIT`, the `UNIT_FILTER` string used when parsing uploaded spreadsheets, the `SK()` localStorage key prefix (`cofco_seb_*` vs `cofco_mer_*`), and cosmetic labels/title. **When fixing a bug or adding a feature in one, mirror the change in the other** — there's no shared include, so keep them in sync manually (a diff between the two files is the fastest way to check what's unit-specific vs. what drifted).
- Each page is a full maintenance-order (OS) dashboard with four tabs: Visão Geral (KPIs + charts), Lista OS (sortable/filterable table), Acompanhamento (workflow/stage tracking with a kanban-like stage picker and priority buttons), and Médias (averages).
- Data comes from an uploaded `.xlsx` workbook, parsed client-side with a vendored, trimmed-down copy of SheetJS (inlined in a `<script>` block, "SheetJS mini" — search for `SheetJS mini` to find it). There is no backend for this data: parsed rows (`csvData`), tracking rows (`acompRows`), history (`hist`), and the reference filename/date (`csvRef`) are persisted to `localStorage` only, under unit-scoped keys produced by `SK('csv' | 'acomp' | 'hist' | 'ref')`. Data does not sync across browsers/devices — each user's uploaded workbook lives only in their own browser.
- A `?leitura=...`-style read-only mode (`body.leitura`) hides all mutating controls (add/delete rows, stage/priority editing, upload) via CSS.

## Working with the user

The user who owns this repo is **not a developer**. They do not know shell/CLI commands, git, GitHub, databases, or general programming concepts, and should never be expected to run commands, resolve merge conflicts, or interpret technical error messages themselves.

- Explain things in plain, non-technical language. Avoid jargon; when a technical term is unavoidable, briefly say what it means in practical terms.
- Don't ask the user to run terminal/git commands, edit files by hand, or use the Supabase dashboard's SQL editor — do it yourself.
- After making any code change, always commit and push it to git (`origin`, current branch) yourself, without asking for confirmation first. The user relies on this happening automatically since they cannot do it themselves. Write a clear, plain-language commit message describing what changed and why.
- If something requires a decision only the user can make (e.g. which unit a dashboard is for, wording of on-screen text), ask in plain terms and offer concrete options rather than technical ones.

## Conventions to preserve

- UI copy is in Brazilian Portuguese (`pt-br`/`pt-BR`); keep new user-facing text consistent with that.
- Pages share a hand-rolled CSS custom-property theme (`--bg`, `--s1`, `--accent`, etc.) rather than a framework; `index.html`/`app.html`/`admin.html` use a light/dark `color-scheme` themed palette, while the dashboard pages (`painel*.html`) use a fixed dark theme.
- `config.js` intentionally only exposes the Supabase *publishable* key — never add the `service_role` secret key to any client-side file.
