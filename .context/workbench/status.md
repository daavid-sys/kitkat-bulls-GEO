# Status — SWARM build (v3 plan active)

Last updated: 2026-04-26 (orchestrator)

## Current state

`frontend-inbox` merged to `main` at `6c644d4` (typecheck clean). Sidebar + ranked Inbox + TaskDrawer + react-router routing now live. Source-URL invariant honored (TaskDrawer top-right open-source button → `task.source_url` in new tab). Pre-existing `import.meta.env` errors in `services/{peec,gemini,tavily}.ts` were already on main before this merge — flagged for `live-apis` follow-up, not blocking.

## Active workstreams

| Branch              | Owner     | Status   | Reads                                         | Blocks                           |
|---------------------|-----------|----------|-----------------------------------------------|----------------------------------|
| `agent-arch`        | this chat | orchestrator | all                                       | (merges others; resolves locks)  |
| `backend-supabase`  | claude-bs | **MERGED** at 8af2a2b. Migrations applied via Supabase MCP, RLS on, tables empty pending seed. | full-plan.md, agents/backend-supabase.md      | (unblocks edge-functions, frontend-inbox)   |
| `frontend-inbox`    | claude-fi | **MERGED** at 6c644d4. Sidebar + Inbox feed + TaskDrawer + router. Lovable will auto-deploy. | full-plan.md, peec-references/, agents/…      | (unblocks deploy-and-glue)       |
| `visual-hero-strip` | claude-vh | **MERGED**. InboxHero strip (visibility + sparkline, queued lift, topic gap mini-bar, agent pulse) above the inbox. | full-plan.md, peec-references/, agents/visual-hero-strip.md | — |
| `visual-inbox-rows` | claude-vir | **MERGED**. Kind rail, real platform glyphs, ROI mini-bar, deterministic sparkline, hover lift. | InboxRow.tsx, inbox-row.css | — |
| `visual-task-drawer` | claude-vtd | **MERGED**. Rich drawer: header band w/ source-URL invariant, impact bar (lift only, no fabricated Peec numbers), 4 draft cards, citation strip, action bar. | TaskDrawer.tsx, task-drawer.css | — |
| `edge-functions`    | TBD       | pending  | full-plan.md (Edge fns section), schema       | deploy-and-glue                  |
| `deploy-and-glue`   | TBD       | pending  | full-plan.md, all above                       | (final — auth + onboarding code only; Lovable handles deploy) |

## Merge order

1. `backend-supabase` → `main` (schema + api + lib).
2. `edge-functions` → `main` (depends on schema being on `main`).
3. `frontend-inbox` → `main` (depends on `api.ts` shape).
4. `deploy-and-glue` → `main` (depends on everything).

The orchestrator merges in this order. Agents do NOT push to `main` themselves.

## Open blockers

None at start. Each chat surfaces its own blockers in its `agents/<name>.md` log file.

## Visual fidelity gap

Sidebar is the biggest remaining gap from v2. Peec UI screenshots in `.context/peec-references/`; `visual-references.md` catalogues each. `frontend-inbox` is responsible for closing this.

## UX density problem (open question)

The existing 3-column composition is too dense, too text-heavy, no symbols, no progressive disclosure. v3 collapses to a single inbox + drawer. Detailed visual choices (icons, symbols, what hides behind toggles, filter bar shape, row composition, empty states, keyboard nav) are flagged for a dedicated UX sub-agent pass before merging `frontend-inbox`. The implementation in v3 covers the structural shift; visual fidelity follows.

## Decisions

See `decisions.md`.
