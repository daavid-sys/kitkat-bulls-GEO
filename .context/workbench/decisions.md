# Decisions log

Append-only. Newest at the top. Format: `## YYYY-MM-DD — title — agent`

---

## 2026-04-25 — Workbench bootstrap — agent-arch

Set up `.context/workbench/` to coordinate parallel Claude agents. File ownership in `ownership.md`. Status in `status.md`.

## 2026-04-25 — Three-agent architecture confirmed — agent-arch

SWARM is structured around three always-on agents: **Trends** (weekly deep research), **Brand Context RAG** (every public mention of the brand, embedded for retrieval), **Conversation Interception** (real-time, Peec-gap-driven). Every agent's output must trace to a Peec metric — if it can't, cut it. See `.context/plans/full-plan.md`.

## 2026-04-25 — Voice as scaffold, not press-send draft — agent-arch

We are not generating finished messages. The Brand Context RAG feeds the system prompt of every Gemini call; the output is a draft scaffold (opener / angle / supporting / cta) plus 3 angle alternates. Human ships.

## 2026-04-25 — Demo opens on pre-built state — agent-arch

The demo opens on a pre-loaded Radar (mocks or pre-cached real data). Live moment is one Gemini regenerate (~2s). No live setup flow during demo.

## 2026-04-25 — Reddit live, LinkedIn pre-cached — agent-arch

Tavily LinkedIn coverage is uneven (per LinkedIn-research subagent). Reddit is reliable. Cache layer makes both code paths identical; demo flips between live and replayed transparently.

## 2026-04-25 — Partner tech: Gemini + Tavily + Lovable — agent-arch

Drop Entire as required tier. Lovable will be used during build for iteration. Aikido for the security side-challenge.

## 2026-04-26 — Lovable replaces Vercel for deployment — agent-arch

federico is using Lovable (connected to the same Supabase project) to deploy `main` to a shareable URL and apply quick UI tweaks. Lovable auto-deploys on merge. No Vercel, no `vercel.json`, no CLI wiring inside this repo.

**Why:** Lovable + Supabase have a native integration, and federico can drive small fixes via Lovable's chat interface without needing another Claude chat. Saves ~30 min of Vercel setup and consolidates the deploy surface.

**How to apply:** Chat D (`deploy-and-glue`) drops Vercel work entirely; its scope is now just `AuthGate.tsx`, `Setup.tsx`, `Settings.tsx`. Deployment plumbing is out of scope for every chat — federico handles it directly.

## 2026-04-25 — Branding direction: dark sidebar Peec match — agent-arch

Reviewed Peec UI screenshots. Current SWARM Radar diverges significantly from Peec's actual app. Agent B (`ui-polish`) is responsible for closing the gap — see `status.md` Visual fidelity gap section.
