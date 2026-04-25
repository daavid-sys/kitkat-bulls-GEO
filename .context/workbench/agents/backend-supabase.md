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

- **2026-04-26** — picked up the slice. Read CLAUDE.md, full-plan.md, workbench docs.
- **2026-04-26** — `supabase init` ran (config.toml + .gitignore generated). `supabase link --project-ref pjyrhjbkpxuomfvaubkk` failed: `SUPABASE_ACCESS_TOKEN` not set in env. Skipped link; not blocking — orchestrator runs link + push when creds land. See blockers below.
- **2026-04-26** — wrote `supabase/migrations/0001_init.sql` (full schema: profiles, brands, topics, visibility_runs, context_chunks vector(768) + ivfflat cosine index, agent_runs, tasks (kind enum), drafts (unique on task_id, autobump updated_at)). `tasks.source_url NOT NULL` per the spec.
- **2026-04-26** — wrote `supabase/migrations/0002_rls.sql`: brand-owner-only on every brand-scoped table via `is_brand_owner(uuid)` security-definer helper; profiles self-only; drafts joined through tasks. RLS uses `auth.uid()`.
- **2026-04-26** — wrote `supabase/seed.ts` (idempotent — clears the demo brand by deterministic UUID, then re-inserts). Seeds: Attio brand, 5 topics, 5 visibility_runs (Attio's own brandByTopic), 12 tasks (kind=opportunity from `attio-curated.json`), 12 prefilled drafts (curated `draftScaffold` so demo never depends on a live Gemini call), 8 ATTIO context chunks embedded via Gemini `text-embedding-004` (768d → pgvector literal). Topic UUIDs derived deterministically from peec topic ids so cross-table refs survive reruns.
- **2026-04-26** — claimed `package.json` in `lock.md`; ran `npm install @supabase/supabase-js` (runtime) + `tsx` (dev). Added `npm run seed` script.
- **2026-04-26** — wrote `src/lib/supabase.ts` (singleton on `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; warns instead of throwing at import).
- **2026-04-26** — wrote `src/services/api.ts` read-only: `getBrand`, `getInbox` (sorted by `estimated_lift × score` desc with optional kind/topic/platform/dismissed/limit filters), `getTask`, `getAgentRuns`, `getDraftFor`, `getApiStatus` (HEAD probe, never throws). Row types declared in-file to keep `src/types/index.ts` untouched.
- **2026-04-26** — `npm run typecheck` clean.

## Blockers (for orchestrator/federico)

- `supabase link` + `supabase db push` not run from this branch: `SUPABASE_ACCESS_TOKEN` is unset in env (and the agent must not touch `.env`). Migrations are in `supabase/migrations/` and ready — orchestrator should:
  1. `export SUPABASE_ACCESS_TOKEN=…`
  2. `npx supabase link --project-ref pjyrhjbkpxuomfvaubkk`
  3. `npx supabase db push`
  4. `export SUPABASE_URL=…; export SUPABASE_SERVICE_ROLE_KEY=…; export GEMINI_API_KEY=…`
  5. `npm run seed`
- `package.json` claim in `lock.md` is for orchestrator review (added `@supabase/supabase-js`, `tsx`, `seed` script).

## Status

**ready to merge** — branch `backend-supabase` pushed at commit `e827a99`. Schema + RLS + seed + client + read API in place; `npm run typecheck` clean. Orchestrator merges to `main`, then runs `supabase link` → `supabase db push` → `npm run seed` (creds required; see Blockers above).


