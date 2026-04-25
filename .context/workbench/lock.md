# Soft-claims for shared files

When you need to edit a file outside your ownership zone (`ownership.md`), add a row here BEFORE you start. Remove your claim when you're done.

## Active claims

| File | Claimed by | Branch | Reason | Claimed at |
|---|---|---|---|---|
| `package.json` | backend-supabase | `backend-supabase` | add `@supabase/supabase-js` (runtime dep for `src/lib/supabase.ts` + `src/services/api.ts`); add `tsx` (dev) for `supabase/seed.ts` | 2026-04-26 |

## How to claim

1. Add a row at the top of the table with your branch name, the file path, and a 1-line reason.
2. Wait briefly to see if another agent already claimed it (check `decisions.md` and other agents' notes).
3. Make the change on your branch.
4. Once merged, remove your row.

If the orchestrator owns the file, claiming = "I want this changed; please review". The orchestrator merges or rejects.
