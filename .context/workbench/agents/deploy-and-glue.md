# deploy-and-glue — running notes

Owner: TBD. Branch: `deploy-and-glue`. Owns: `src/components/AuthGate.tsx` (new), `src/pages/Setup.tsx` (new), `src/pages/Settings.tsx` (new).

## Mission

Build the in-repo onboarding + auth + settings code that Lovable picks up. **You do NOT touch deployment plumbing** — federico runs Lovable directly (connected to the same Supabase project) and Lovable auto-deploys `main` to a shareable URL.

Build `AuthGate` (Supabase Auth magic-link), `/setup` wizard (domain → ingest → /inbox), and `/settings` (brand admin).

## Dependency

You DEPEND on `backend-supabase` landing `api.ts` on main. While you wait, sketch components against the contract in `full-plan.md`.

## Backlog

- [ ] Read `CLAUDE.md`, `.context/plans/full-plan.md` (note Stack section says Lovable, not Vercel), `.context/workbench/{README,status,ownership}.md`.
- [ ] Build `src/components/AuthGate.tsx` — Supabase Auth magic-link. Sign-in screen if no session; render children if signed in. Document the federico@... pre-creation step here.
- [ ] Build `src/pages/Setup.tsx` — 4-step wizard (domain → competitors → seed URLs → ingestion stream via Realtime → redirect to `/inbox`).
- [ ] Build `src/pages/Settings.tsx` — current brand info, list of seed URLs, "Re-ingest" button, paginated `context_chunks` with their source URLs.
- [ ] Smoke-check locally with `npm run dev`. Lovable handles deploy automatically once orchestrator merges.

## Hard constraints

- Stay in ownership zone (claim `App.tsx` in `lock.md` if you need to wrap it in `AuthGate`).
- Append a dated bullet to this file after every turn.
- Do NOT touch services, `components/{Sidebar,Inbox,Header}`.
- Do NOT touch `vercel.json`, deployment configs, or any infra plumbing — Lovable owns deploy.
- Do NOT push to `main`.
- STOP if Supabase Auth or Realtime wiring takes more than 30 minutes — likely a config issue worth surfacing. Append blocker and tell federico.

## Log

- _empty — agent has not started yet._
