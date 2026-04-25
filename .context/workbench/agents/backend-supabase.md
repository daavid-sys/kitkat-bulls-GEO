# backend-supabase — running notes

Owner: TBD. Branch: `backend-supabase`. Owns: `supabase/migrations/`, `supabase/seed.ts`, `src/lib/supabase.ts`, `src/services/api.ts` (read functions only).

## Mission

Stand up the Supabase project, write migrations + RLS, seed it from the existing snapshot files, and expose a read-only `api.ts` the frontend can call. This unlocks `frontend-inbox` and `edge-functions`.

## Backlog

- [ ] Read `CLAUDE.md`, `.context/plans/full-plan.md`, `.context/workbench/{README,status,ownership}.md`.
- [ ] `supabase init`; link to project (ref `pjyrhjbkpxuomfvaubkk`).
- [ ] Write `supabase/migrations/0001_init.sql` — full schema from full-plan.md (brands, topics, visibility_runs, context_chunks with `vector(768)`, agent_runs, tasks (kind enum), drafts, profiles).
- [ ] Write `supabase/migrations/0002_rls.sql` — brand-owner-only policies on all tables.
- [ ] `supabase db push`.
- [ ] Write `supabase/seed.ts` — idempotent UPSERTs from `src/data/snapshot.json` and `src/data/attio-curated.json`. Embed the 8 ATTIO context chunks via Gemini `text-embedding-004`.
- [ ] Run seed; verify rows in Supabase SQL editor.
- [ ] Write `src/lib/supabase.ts` (client singleton).
- [ ] Write `src/services/api.ts` read-only: `getBrand`, `getInbox`, `getTask`, `getAgentRuns`, `getDraftFor`, `getApiStatus`.
- [ ] `npm run typecheck` clean.
- [ ] Commit, push branch.

## Hard constraints

- Stay in ownership zone. Anything outside = `lock.md` claim + announce here.
- Append a dated bullet to this file after every turn.
- `npm run typecheck` before every commit.
- Do NOT push to `main`; orchestrator merges.
- STOP if you find yourself doing more than 2 workarounds for the same problem, or if the schema starts feeling wrong. Append blocker and tell federico.

## Log

- _empty — agent has not started yet._
