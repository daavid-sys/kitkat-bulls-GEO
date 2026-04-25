# deploy-and-glue — running notes

Owner: TBD. Branch: `deploy-and-glue`. Owns: `vercel.json`, `.vercelignore`, `src/components/AuthGate.tsx` (new), `src/pages/Setup.tsx` (new), `src/pages/Settings.tsx` (new), deployment configs.

## Mission

Get SWARM deployed on a public URL (Vercel + Supabase cloud). Build the onboarding wizard at `/setup` that takes a domain, kicks `agent-context-ingest`, streams progress, and lands on `/inbox`. Build `/settings` for brand admin. Wire auth.

## Dependency

You DEPEND on `backend-supabase` landing `api.ts` and `frontend-inbox` landing the router. Vercel + env wiring + sketches against the full-plan.md contract are parallelizable while you wait.

## Backlog

- [ ] Read `CLAUDE.md`, `.context/plans/full-plan.md`, `.context/workbench/{README,status,ownership}.md`.
- [ ] `vercel link`, `vercel deploy`. Configure env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PEEC_API_KEY`, `VITE_PEEC_PROJECT_ID`, `VITE_TAVILY_API_KEY`, `VITE_GEMINI_API_KEY`.
- [ ] Verify deployed URL works in incognito.
- [ ] Build `src/components/AuthGate.tsx` — Supabase Auth magic-link. For demo, pre-create a `federico@…` user owning Attio so session restore works.
- [ ] Build `src/pages/Setup.tsx` — 4-step wizard (domain → competitors → seed URLs → ingestion stream → redirect to `/inbox`).
- [ ] Build `src/pages/Settings.tsx` — current brand info, list of seed URLs, "Re-ingest" button, paginated `context_chunks` with their source URLs.
- [ ] Final deploy. Confirm full e2e in incognito.

## Hard constraints

- Stay in ownership zone (claim `App.tsx` in `lock.md` if you need to wrap it in `AuthGate`).
- Append a dated bullet to this file after every turn.
- Do NOT touch services, `components/{Sidebar,Inbox,Header}`.
- Do NOT push to `main`.
- STOP if Vercel/Supabase env wiring takes more than 30 minutes — likely a config issue worth surfacing rather than working around. Append blocker and tell federico.

## Log

- _empty — agent has not started yet._
