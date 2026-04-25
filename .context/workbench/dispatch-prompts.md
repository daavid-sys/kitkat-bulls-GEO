# Dispatch prompts for parallel chats (v3)

Copy-paste each block into a new Conductor workspace on the matching branch. Each prompt is self-contained and points the agent at the master plan plus the workbench.

---

## Chat A — `backend-supabase`

```
You are joining the SWARM hackathon project as the backend-supabase agent.
Branch: `backend-supabase`. You ONLY edit files in:
  - supabase/migrations/
  - supabase/seed.ts
  - src/lib/supabase.ts
  - src/services/api.ts (read functions only — no mutations yet)

Read these in order before doing anything:
  1. /Users/federico/conductor/workspaces/peek-hackathon-track/minnetonka/CLAUDE.md
  2. /Users/federico/conductor/workspaces/peek-hackathon-track/minnetonka/.context/plans/full-plan.md
  3. /Users/federico/conductor/workspaces/peek-hackathon-track/minnetonka/.context/workbench/README.md
  4. .context/workbench/status.md
  5. .context/workbench/ownership.md
  6. .context/workbench/agents/backend-supabase.md (your backlog)

Your slice:
  1. supabase init; link to existing project (ref in .env: SUPABASE_PROJECT_REF=pjyrhjbkpxuomfvaubkk).
  2. Write supabase/migrations/0001_init.sql with the full schema from full-plan.md
     (brands, topics, visibility_runs, context_chunks with vector(768),
      agent_runs, tasks (kind enum), drafts, profiles).
  3. Write supabase/migrations/0002_rls.sql with brand-owner-only policies.
  4. supabase db push.
  5. Write supabase/seed.ts. Reads src/data/snapshot.json + src/data/attio-curated.json.
     Idempotent UPSERTs: Attio brand + topics + visibility_runs + 12 tasks (kind=opportunity)
     + 8 ATTIO context chunks (embedded inline via Gemini text-embedding-004).
  6. Run seed; verify rows in Supabase SQL editor.
  7. Write src/lib/supabase.ts (client singleton; reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).
  8. Write src/services/api.ts read-only:
     - getBrand(brandId)
     - getInbox(brandId, filters?)
     - getTask(taskId)
     - getAgentRuns(brandId, limit=5)
     - getDraftFor(taskId)
     - getApiStatus()
  9. npm run typecheck. Must pass.
  10. Commit, push branch, append "ready to merge" to your agents file.

HARD RULES:
  - Stay in your ownership zone. Anything else: claim in .context/workbench/lock.md and announce in your agents file.
  - Append a dated bullet to .context/workbench/agents/backend-supabase.md after every turn.
  - Do NOT touch components, edge functions, types/index.ts (without claim), or .env.
  - Do NOT push to main. The orchestrator merges.
  - STOP if you find yourself doing more than 2 workarounds for the same problem, or if the schema starts feeling wrong. Append your blocker to your agents file and tell federico.
```

---

## Chat B — `frontend-inbox`

```
You are joining the SWARM hackathon project as the frontend-inbox agent.
Branch: `frontend-inbox`. You ONLY edit files in:
  - src/pages/
  - src/components/Sidebar.tsx, InboxRow.tsx, TaskDrawer.tsx, FilterBar.tsx (new)
  - src/components/Header.tsx (extend, do NOT rewrite)
  - src/styles/

Read these in order:
  1. /Users/federico/conductor/workspaces/peek-hackathon-track/minnetonka/CLAUDE.md
  2. .context/plans/full-plan.md
  3. .claude/commands/design-system.md
  4. .context/workbench/README.md, status.md, ownership.md, visual-references.md
  5. .context/workbench/agents/frontend-inbox.md (your backlog)
  6. Look at every screenshot in .context/peec-references/

Your slice:
  1. Build src/components/Sidebar.tsx — dark left rail (~220px) matching the Peec layout. Sections:
     Inbox / Trends / Sources / Brand / Settings. Uses public/peec-logo.jpg at the top.
  2. Build src/pages/Inbox.tsx — single ranked feed. Calls api.getInbox() (from backend-supabase).
     If api.ts not yet present, develop against a local stub matching the contract in full-plan.md.
  3. Build src/components/InboxRow.tsx — minimal row: kind icon, title, source domain, ROI badge.
     Click → opens TaskDrawer.
  4. Build src/components/TaskDrawer.tsx — right-slide drawer:
     - left half: original post body + author + published date
     - right half: draft scaffold (load existing or empty)
     - bottom: retrieved context chunk citations (3 max) with their source URLs
     - top-right: external-link button → opens task.source_url in new tab
     SOURCE URL link must be present and clickable. This is non-negotiable.
  5. Extend src/components/Header.tsx to sit on top of Sidebar layout. Status pill reads getApiStatus().
  6. Build src/components/FilterBar.tsx (only if time): pill-shaped dropdown filters above the feed.
  7. Wire react-router-dom in src/App.tsx (this is shared — claim in lock.md):
     /, /inbox (default), /settings (placeholder), /setup (placeholder).
  8. Move legacy components (Radar.tsx, VisibilityBar.tsx, TrendsRail.tsx,
     VoiceProfilePanel.tsx, ConversationCard.tsx) to src/components/legacy/.
     Do not delete — App.tsx may temporarily fall back during transition.
  9. Use Chrome DevTools MCP (port 5173) to verify visually after each major change.
  10. npm run typecheck. Must pass.
  11. Commit, push, append "ready to merge".

HARD RULES:
  - Stay in your ownership zone. Anything else: claim in lock.md.
  - Append dated bullet to .context/workbench/agents/frontend-inbox.md after every turn.
  - Do NOT touch services, types, or supabase/.
  - Do NOT push to main.
  - STOP if you start fighting the layout for more than 3 attempts on the same component, or
    if the inbox composition feels wrong. Append your blocker and tell federico.
```

---

## Chat C — `edge-functions`

```
You are joining the SWARM hackathon project as the edge-functions agent.
Branch: `edge-functions`. You ONLY edit files in:
  - supabase/functions/

You DEPEND ON the backend-supabase chat landing the schema first. If supabase/migrations/0001_init.sql
doesn't exist on `main` yet, STOP and tell federico — your work needs that landed first.

Read these in order:
  1. /Users/federico/conductor/workspaces/peek-hackathon-track/minnetonka/CLAUDE.md
  2. .context/plans/full-plan.md (Architecture + Edge Functions sections)
  3. .context/workbench/README.md, status.md, ownership.md
  4. .context/workbench/agents/edge-functions.md (your backlog)
  5. The existing src/agents/{trends,context,interception}.ts — you are porting their logic to Deno.

Your slice:
  1. supabase functions new agent-context-ingest, agent-trends, agent-interception, agent-outdated-content.
  2. agent-context-ingest:
     Input: { brandId, sourceUrls[] }.
     Tavily Extract → chunk by paragraph (200–400 tokens) → Gemini embed (text-embedding-004, 768d)
     → upsert context_chunks. Also extract voice via Gemini → update brands.voice_profile.
  3. agent-trends:
     Tavily sweep on weak topics → Gemini summarize → insert tasks(kind='trend') + agent_runs row.
  4. agent-interception:
     Peec gaps → query gen → Tavily multi → score → embed query →
     pgvector cosine retrieval (top 3 chunks) → insert tasks(kind='opportunity')
     + create empty drafts with context_chunk_ids populated.
  5. agent-outdated-content:
     Iterate brand's own context_chunks; Tavily Search citations to source_url last 90d;
     if ingested_at > 6 months ago AND citations > 0 → emit tasks(kind='outdated_content').
  6. Each function: insert agent_runs at start (status='running', trace=[]), append step traces
     as it goes (pushTrace helper), mark status='done' at end.
  7. supabase functions deploy. curl-test each.
  8. Commit, push, append "ready to merge".

HARD RULES:
  - Stay in your ownership zone.
  - Append dated bullet to your agents file after every turn.
  - Do NOT modify migrations, components, services, or src/agents/.
  - Do NOT push to main.
  - STOP if Tavily Extract fails consistently for the demo brand, or if pgvector retrieval
    accuracy seems random. Append your blocker and tell federico — don't paper over with 1000
    retries that won't survive past the demo.
```

---

## Chat D — `deploy-and-glue` (renamed in spirit to "auth-and-onboarding" — kept as deploy-and-glue branch for continuity)

```
You are joining the SWARM hackathon project as the deploy-and-glue agent.
Branch: `deploy-and-glue`. You ONLY edit files in:
  - src/components/AuthGate.tsx (new)
  - src/pages/Setup.tsx (new)
  - src/pages/Settings.tsx (new)

DEPLOYMENT NOTE: Vercel is OUT. federico runs Lovable directly outside this chat.
Lovable is connected to the same Supabase project and auto-deploys `main` to a
shareable URL. You do NOT touch deployment plumbing. No vercel.json, no CLI wiring.
Your job is the in-repo auth + onboarding + settings code that Lovable picks up.

You DEPEND ON backend-supabase landing api.ts on main. While you wait, you can sketch
AuthGate / Setup / Settings against the contract in full-plan.md.

Read these in order:
  1. /Users/federico/conductor/workspaces/peek-hackathon-track/minnetonka/CLAUDE.md
  2. .context/plans/full-plan.md  (note Stack section: Lovable, not Vercel)
  3. .context/workbench/README.md, status.md, ownership.md
  4. .context/workbench/agents/deploy-and-glue.md (your backlog)

Your slice:
  1. Build src/components/AuthGate.tsx — Supabase Auth magic-link.
     - On mount: getSession(); if missing, render the sign-in screen.
     - Sign-in screen: single email input + "Send magic link" button (supabase.auth.signInWithOtp).
     - On session: render children. Provide a useBrand() hook downstream that reads the user's
       owning brand_id from the brands table.
     - For the demo, federico will pre-create a federico@... user owning Attio so the session
       restores cleanly. Document the pre-creation step in your agents file.
  2. Build src/pages/Setup.tsx — 4-step wizard:
     Step 1: domain input.
     Step 2: competitors (auto-suggest from Peec API or paste 2–3).
     Step 3: seed URLs (default to homepage / /blog / /about; let user edit).
     Step 4: trigger agent-context-ingest, subscribe to the agent_runs Realtime channel,
             show streaming progress (step labels from the trace), redirect to /inbox when
             status='done'.
  3. Build src/pages/Settings.tsx — current brand info, list of seed URLs, "Re-ingest" button
     that re-triggers agent-context-ingest, paginated list of context_chunks with source URLs.
  4. Smoke-check by running locally (`npm run dev`). Lovable will deploy main automatically
     once the orchestrator merges your branch — you do NOT deploy yourself.
  5. Append "ready to merge" to your agents file.

HARD RULES:
  - Stay in your ownership zone (claim App.tsx in lock.md if you need to wrap it in AuthGate).
  - Append a dated bullet to your agents file after every turn.
  - Do NOT touch services, components/Sidebar/Inbox/Header.
  - Do NOT push to main. The orchestrator merges, Lovable picks up.
  - Do NOT touch vercel.json, deployment configs, or any infra plumbing — Lovable owns deploy.
  - STOP if Supabase Auth or Realtime wiring takes more than 30 minutes — likely a config
    issue worth surfacing rather than working around. Append blocker and tell federico.
```
