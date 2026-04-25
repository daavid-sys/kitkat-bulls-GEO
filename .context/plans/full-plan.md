# SWARM master plan v3

This is the single reference every parallel chat reads. Architecture, schema, edge functions, frontend layout, cuts list, verification — all here. The execution-time dispatch prompts live in `.context/workbench/dispatch-prompts.md`. The original strategic context (vision, demo flow, partner tech) is preserved in this document.

## Vision

SWARM is the offense to Peec's scoreboard. AI engines learn from the internet — LinkedIn, Reddit, X, blogs. If you're not in those conversations, you're invisible to the next generation of buyers. SWARM gives a 3-person marketing team an inbox of ranked tasks that move the Peec scoreboard. Onboarding takes a domain; agents ingest, embed, monitor; each task carries a quantitative Peec lift estimate and a draft scaffold.

**Demo line**: "HubSpot has 78% AI search visibility. Attio has 33%. HubSpot has 200 marketers. Attio has 5. How do 5 people compete? They don't. They SWARM."

## Counter-positioning vs Peec's existing recommendations

Peec already surfaces "get featured here" suggestions but they are static, surface-level, not agentic, and stop short. They don't quantify the visibility lift, don't draft the move, and don't drive a next step. **That gap is the product.**

## Inbox UX (replaces the 3-column Radar)

- Single ranked feed of `tasks` sorted by ROI (`estimated_lift × score`).
- Task kinds: `trend` | `opportunity` | `outdated_content` | `mention`.
- Minimum info per row: kind icon, title, source domain, ROI badge.
- Click → right-slide drawer with full body, retrieved context citations, draft scaffold, and the source URL (clickable, opens in new tab).
- Direct source URLs are a hard invariant — `tasks.source_url` is `NOT NULL` in the schema.
- UX density is an open problem flagged for a dedicated sub-agent pass before merge. The structural shift (3-col → 1-col + drawer) lands in this plan; visual polish comes from the sub-agent's output.

## Onboarding flow at `/setup`

4-step wizard:

1. Enter domain.
2. Pick competitors (auto-suggest via Peec API, or paste 2–3).
3. Pick seed URLs (defaults: homepage, `/blog`, `/about`; editable).
4. Kick `agent-context-ingest`. Stream progress via Supabase Realtime. Redirect to `/inbox` when `agent_runs.status = 'done'`.

The voice profile is computed during ingestion. The brand context corpus is the result of real Tavily Extract + Gemini embedding, not a hardcoded list.

## Architecture

### Stack

- Frontend: Vite + React + TS, deployed on Vercel.
- Backend: Supabase (Postgres + pgvector + Edge Functions + Auth + Realtime).
- AI: Google Gemini (`gemini-2.5-flash-lite` for completions, `text-embedding-004` for embeddings).
- Discovery: Tavily Search + Tavily Extract (proxied via Vite in dev, direct in prod).
- Visibility intelligence: Peec AI REST API.

Project ref already in `.env.example`: `SUPABASE_PROJECT_REF=pjyrhjbkpxuomfvaubkk`.

### Schema (`supabase/migrations/0001_init.sql`)

```
profiles               (id, email, created_at)                            -- mirrors auth.users
brands                 (id, owner_id, name, domain, peec_brand_id,
                        peec_project_id, voice_profile JSONB, seed_urls[],
                        created_at)
topics                 (id, brand_id, peec_topic_id, name)
visibility_runs        (id, brand_id, topic_id, visibility, share_of_voice,
                        sentiment, ran_at)
context_chunks         (id, brand_id, source_url, source_type, text,
                        topic_ids[], embedding vector(768),
                        is_likely_outdated bool default false,
                        last_traffic_check_at timestamptz, ingested_at)
agent_runs             (id, brand_id, agent_kind, status, trace JSONB,
                        started_at, finished_at)
tasks                  (id, brand_id, agent_run_id, kind, status,
                        title, summary, source_url, source_domain,
                        platform, related_topic_id, estimated_lift,
                        score, raw JSONB, dismissed_at, created_at)
                        -- kind enum: 'trend' | 'opportunity' | 'outdated_content' | 'mention'
drafts                 (id, task_id, opener, angle, supporting, cta,
                        alternates JSONB, context_chunk_ids uuid[],
                        status, updated_at)
```

`tasks.source_url` is `NOT NULL`. RLS: a user only sees rows for brands where `owner_id = auth.uid()`.

### Edge functions (`supabase/functions/`)

- `agent-context-ingest` — Tavily Extract → chunk by paragraph (200–400 tokens) → Gemini embed (`text-embedding-004`, 768d) → upsert `context_chunks`. Also extract voice via Gemini → update `brands.voice_profile`.
- `agent-trends` — Tavily sweep on weak topics → Gemini summarize → insert `tasks(kind='trend')` + `agent_runs` row.
- `agent-interception` — Peec gaps → query gen → Tavily multi → score → embed query → pgvector cosine retrieval (top 3 chunks) → insert `tasks(kind='opportunity')` + create empty `drafts` with `context_chunk_ids` populated.
- `agent-outdated-content` — iterate brand's own `context_chunks`; Tavily Search citations to each `source_url` last 90d; if `ingested_at` > 6 months ago AND citations > 0 → emit `tasks(kind='outdated_content')`.

Each function: insert `agent_runs` at start (`status='running'`, `trace=[]`), append step traces (`pushTrace` helper), mark `status='done'` at end. Frontend subscribes via Supabase Realtime.

### Frontend

- `src/lib/supabase.ts` — client singleton.
- `src/services/api.ts` — `getBrand`, `getInbox`, `getTask`, `triggerAgentRun`, `subscribeToRun`, `saveDraft`, `listAgentRuns`, `getApiStatus`.
- `src/services/discovery.ts` — collapses to a wrapper around `api.getInbox`.
- `src/pages/Setup.tsx`, `src/pages/Inbox.tsx`, `src/pages/Settings.tsx`.
- `src/components/Sidebar.tsx`, `Header.tsx` (extend), `InboxRow.tsx`, `TaskDrawer.tsx`, `RunHistory.tsx`, `AuthGate.tsx`, `FilterBar.tsx`.
- Legacy components in `src/components/legacy/` during transition. Don't delete — the old Radar may temporarily render as fallback.

### Data flow

```
Browser
   │
   ├──> @supabase/supabase-js
   │       reads:  brands, agent_runs, tasks, drafts, trends, context_chunks
   │       writes: drafts (autosave), brand setup, "refresh" trigger
   │
   └──> Realtime channel: agent_runs.status changes — stream traces

Supabase Edge Functions (Deno + TS)
   ├── agent-context-ingest    → context_chunks (with embeddings)
   ├── agent-trends            → tasks(kind='trend')
   ├── agent-interception      → tasks(kind='opportunity') + drafts
   └── agent-outdated-content  → tasks(kind='outdated_content')
```

## Cuts list (apply in order if behind schedule)

1. Drop `agent-outdated-content`. Document as stub; keep schema and inbox kind so it still feels real.
2. Drop streaming traces — poll instead of using Realtime.
3. Drop magic-link auth. Anon access + hardcoded brand_id for demo. Restore post-demo.
4. Drop `agent-trends` edge function. Run trends from frontend with one Gemini call.
5. Pre-record the onboarding flow instead of running live. Seed `federico@…` directly.

## Partner tech (3 required for hackathon)

1. **Google DeepMind (Gemini)** — completions + embeddings.
2. **Tavily** — search + extract (Reddit live, LinkedIn pre-cached via snapshot fallback).
3. **Lovable** — used during build for UI iteration.

Side challenge: Aikido for "Most Secure Build" (free 1,000 EUR) — connect repo before demo.

## Demo flow (target 1:30, hard cap 1:45)

1. **0:00–0:10** — Hook. "HubSpot 78%, Attio 33%. 5 marketers vs 200. They SWARM."
2. **0:10–0:35** — Problem. Peec is the scoreboard, but its "get featured here" recs stop short. SWARM is the offense.
3. **0:35–0:55** — Onboarding live. Type a domain, watch ingestion stream, land on Inbox.
4. **0:55–1:20** — Inbox demo. Mix of trend / opportunity / outdated cards sorted by ROI. Click the hero card → drawer with RAG citations + draft scaffold + source URL. Click "Regenerate" — one live Gemini call.
5. **1:20–1:30** — Flywheel close. "Peec measures. SWARM moves the number. Three marketers, every conversation."

## Verification (must pass before declaring done)

1. **Deployed** — public Vercel URL works in incognito.
2. **Onboarding live** — type a fresh domain on stage, ingestion completes within ~60s, redirect to `/inbox`.
3. **Inbox correctness** — feed sorted by `lift × score`, mixed kinds with distinct chips, every row clickable.
4. **Source URL** — every `tasks.source_url` is `NOT NULL` and opens externally on click.
5. **Drafts persist** — edit, refresh, edit survives.
6. **Real RAG** — `drafts.context_chunk_ids` non-empty; citations panel shows 3 chunks.
7. **Agent observability** — `agent_runs.status` transitions visibly; run history modal shows trace.
8. **Peec chrome match** — sidebar present, dark top bar, cream content.
9. `npm run typecheck` clean; `supabase status` green; no console errors.
10. UX sub-agent output reviewed and applied to `InboxRow` + `TaskDrawer`.

## Out of scope (post-demo)

- Multi-brand admin UI beyond `/settings`
- Email/Slack notifications on agent run completion
- Cross-brand benchmarking
- Public API for SWARM data
- Demo brand seeding for Nothing/BYD
- Auto-ingestion crawler refresh on a schedule
- Mobile layout
- Internationalisation
