# frontend-inbox — running notes

Owner: TBD. Branch: `frontend-inbox`. Owns: `src/pages/Inbox.tsx`, `src/components/{Sidebar,InboxRow,TaskDrawer,FilterBar,RunHistory}.tsx`, `src/components/legacy/`, `src/components/Header.tsx` (extend only), `src/styles/` (additions only).

## Mission

Replace the 3-column Radar with a single ranked Inbox feed + right-slide TaskDrawer. Build the dark left Sidebar matching Peec's actual UI. Direct source URLs on every task (non-negotiable).

## Backlog

- [ ] Read `CLAUDE.md`, `.context/plans/full-plan.md`, `.claude/commands/design-system.md`, `.context/workbench/{README,status,ownership,visual-references}.md`. Look at every screenshot in `.context/peec-references/`.
- [ ] Build `src/components/Sidebar.tsx` — dark left rail (~220px). Sections: Inbox / Trends / Sources / Brand / Settings. Uses `public/peec-logo.jpg`.
- [ ] Build `src/pages/Inbox.tsx` — single ranked feed. Calls `api.getInbox()`. Stub locally if `api.ts` not yet on `main`.
- [ ] Build `src/components/InboxRow.tsx` — minimal row: kind icon, title, source domain, ROI badge.
- [ ] Build `src/components/TaskDrawer.tsx` — right-slide drawer with original-post body, draft scaffold, retrieved citations (3 max), source-URL link (top-right).
- [ ] Extend `src/components/Header.tsx` to sit on top of Sidebar layout. Status pill reads `getApiStatus()`.
- [ ] Build `src/components/FilterBar.tsx` if time allows.
- [ ] Wire `react-router-dom` in `src/App.tsx` (claim in `lock.md` first): `/`, `/inbox`, `/settings` (placeholder), `/setup` (placeholder).
- [ ] Move legacy components to `src/components/legacy/`. Don't delete.
- [ ] Use Chrome DevTools MCP at `localhost:5173` to verify visually after each major change.
- [ ] `npm run typecheck` clean.
- [ ] Commit, push branch.

## Hard constraints

- Stay in ownership zone. Anything outside = `lock.md` claim.
- Append a dated bullet to this file after every turn.
- `npm run typecheck` before every commit.
- Do NOT push to `main`.
- STOP if you fight the layout for more than 3 attempts on the same component, or if the inbox composition feels wrong. Append blocker and tell federico.

## Log

- _empty — agent has not started yet._
