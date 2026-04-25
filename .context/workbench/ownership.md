# File and directory ownership (v3)

Hard rule: agents only write files in their owned paths. To touch anything outside, claim it in `lock.md` first and announce it in your `agents/<name>.md`.

## Owners

| Agent                       | Branch              | Owns (write)                                                                                                                                                                                       | Forbidden                                                                                       |
|-----------------------------|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| **agent-arch (orchestrator)** | `agent-arch`        | `.context/workbench/{status,ownership,decisions}.md`, `.context/plans/full-plan.md`, `src/types/index.ts`, `src/agents/`, `src/services/discovery.ts`                                              | (resolves conflicts; merges)                                                                    |
| **backend-supabase**        | `backend-supabase`  | `supabase/migrations/`, `supabase/seed.ts`, `src/lib/supabase.ts`, `src/services/api.ts` (read-only funcs)                                                                                          | components, edge functions, types/index.ts (without claim), .env                                |
| **frontend-inbox**          | `frontend-inbox`    | `src/pages/Inbox.tsx`, `src/components/{Sidebar,InboxRow,TaskDrawer,FilterBar,RunHistory}.tsx`, `src/components/legacy/`, `src/components/Header.tsx` (extend only), `src/styles/` (additions only) | services/, supabase/, types/index.ts (without claim), App.tsx (claim required)                  |
| **edge-functions**          | `edge-functions`    | `supabase/functions/`                                                                                                                                                                              | migrations, components, services, src/agents/                                                   |
| **deploy-and-glue**         | `deploy-and-glue`   | `vercel.json`, `.vercelignore`, `src/components/AuthGate.tsx`, `src/pages/{Setup,Settings}.tsx`, deployment configs                                                                                 | components/Inbox/Sidebar/Header (without claim), services/, supabase/migrations/, supabase/functions/ |

## Shared files (require `lock.md` claim)

These files belong to the orchestrator. Any other agent that needs to edit them must claim in `lock.md` AND announce in their `agents/<name>.md`.

- `package.json`, `package-lock.json`
- `vite.config.ts`, `tsconfig*.json`
- `src/App.tsx`, `src/main.tsx`
- `src/types/index.ts`
- `CLAUDE.md`
- `.env.example` (additions OK; removals require claim)

## Discovery service note

`backend-supabase` owns `src/services/api.ts`. `agent-arch` owns `src/services/discovery.ts` (which collapses to a thin wrapper around `api.ts`). If `backend-supabase` needs to change a public function signature in `api.ts` after `agent-arch` has wired `discovery.ts` to it, claim the discovery file in `lock.md`.

## Edge-function dependency

`edge-functions` cannot deploy until `backend-supabase` lands the schema on `main`. If you're on `edge-functions` and the migration doesn't exist on `main`, STOP — append your blocker to `agents/edge-functions.md` and tell federico.
