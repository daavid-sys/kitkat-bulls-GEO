# edge-functions — running notes

Owner: TBD. Branch: `edge-functions`. Owns: `supabase/functions/`.

## Mission

Port the four agents (context-ingest, trends, interception, outdated-content) to Deno-runtime Supabase Edge Functions. Each writes an `agent_runs` row with a structured trace; outputs land in `tasks` / `drafts` / `context_chunks`.

## Dependency

You DEPEND on `backend-supabase` landing the schema on `main`. If `supabase/migrations/0001_init.sql` is not yet on `main`, STOP and tell federico.

## Backlog

- [ ] Read `CLAUDE.md`, `.context/plans/full-plan.md` (Architecture + Edge Functions sections), `.context/workbench/{README,status,ownership}.md`.
- [ ] Read existing `src/agents/{trends,context,interception}.ts` — you are porting their logic.
- [ ] `supabase functions new agent-context-ingest`, `agent-trends`, `agent-interception`, `agent-outdated-content`.
- [ ] **agent-context-ingest** — Tavily Extract → chunk by paragraph (200–400 tokens) → Gemini embed (`text-embedding-004`, 768d) → upsert `context_chunks`. Also extract voice via Gemini → update `brands.voice_profile`.
- [ ] **agent-trends** — Tavily sweep on weak topics → Gemini summarize → insert `tasks(kind='trend')` + `agent_runs` row.
- [ ] **agent-interception** — Peec gaps → query gen → Tavily multi → score → embed query → pgvector cosine retrieval (top 3 chunks) → insert `tasks(kind='opportunity')` + create empty `drafts` with `context_chunk_ids` populated.
- [ ] **agent-outdated-content** — iterate brand's own `context_chunks`; Tavily Search citations to `source_url` last 90d; if `ingested_at` > 6 months ago AND citations > 0 → emit `tasks(kind='outdated_content')`.
- [ ] Each function: insert `agent_runs` at start (`status='running'`, `trace=[]`), append step traces, mark `status='done'` at end.
- [ ] `supabase functions deploy`. `curl`-test each function.
- [ ] Commit, push branch.

## Hard constraints

- Stay in ownership zone.
- Append a dated bullet to this file after every turn.
- Do NOT modify migrations, components, services, or `src/agents/`.
- Do NOT push to `main`.
- STOP if Tavily Extract fails consistently for the demo brand, or if pgvector retrieval accuracy seems random. Append blocker and tell federico — do not paper over with 1000 retries.

## Log

- _empty — agent has not started yet._
