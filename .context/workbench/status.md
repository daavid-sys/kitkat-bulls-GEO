# Status — SWARM build (v3 plan active)

Last updated: 2026-04-26 (orchestrator)

## Current state

Cleanup complete. v2 parallel-agent work (UI polish, live APIs + snapshot, curated demo data) landed on `main` at commit `4684bff`. Workbench bootstrapped for v3. Four parallel chats are dispatched (or pending dispatch) — see `dispatch-prompts.md` and `agents/*.md` for each chat's backlog.

## Active workstreams

| Branch              | Owner     | Status   | Reads                                         | Blocks                           |
|---------------------|-----------|----------|-----------------------------------------------|----------------------------------|
| `agent-arch`        | this chat | orchestrator | all                                       | (merges others; resolves locks)  |
| `backend-supabase`  | TBD       | pending  | full-plan.md, agents/backend-supabase.md      | edge-functions, frontend-inbox   |
| `frontend-inbox`    | TBD       | pending  | full-plan.md, peec-references/, agents/…      | deploy-and-glue                  |
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
