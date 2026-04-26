import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { InboxRow, type InboxTask, type InboxDraft, type TaskKind } from '../components/InboxRow';
import { TaskDrawer } from '../components/TaskDrawer';
import { FilterBar, type KindFilter } from '../components/FilterBar';
import { InboxHero } from '../components/InboxHero';
import { getInbox, getDraftFor, type TaskRow, type DraftRow } from '../services/api';

// Deterministic UUID for the seeded Attio demo brand. Mirrors `BRAND_ID` in
// supabase/seed.ts. Pre-auth: hardcoded for the demo.
const ATTIO_BRAND_ID = '11111111-1111-4111-8111-000000000001';

export function Inbox() {
  const [tasks, setTasks] = useState<InboxTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, InboxDraft>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<KindFilter>('all');

  useEffect(() => {
    let mounted = true;
    getInbox(ATTIO_BRAND_ID)
      .then((rows) => {
        if (!mounted) return;
        setTasks(rows.map(toInboxTask));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setTasks([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Lazy-fetch the draft for whichever row is currently selected. Cached in
  // `drafts` so re-selecting a row doesn't re-hit Supabase.
  useEffect(() => {
    if (!selectedId || drafts[selectedId]) return;
    let mounted = true;
    getDraftFor(selectedId)
      .then((row) => {
        if (!mounted || !row) return;
        setDrafts((d) => ({ ...d, [selectedId]: toInboxDraft(row) }));
      })
      .catch(() => {
        // Drawer renders fine without a draft; swallow.
      });
    return () => {
      mounted = false;
    };
  }, [selectedId, drafts]);

  const ranked = useMemo(() => {
    if (!tasks) return null;
    const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.kind === filter);
    return [...filtered].sort(
      (a, b) => b.estimated_lift * b.score - a.estimated_lift * a.score,
    );
  }, [tasks, filter]);

  const selected = ranked?.find((t) => t.id === selectedId) ?? null;
  const draftForSelected = selected ? drafts[selected.id] ?? null : null;

  return (
    <>
      <FilterBar
        value={filter}
        onChange={setFilter}
        counts={tasks ? countByKind(tasks) : null}
      />
      <InboxHero tasks={tasks} />
      <div className="swarm-inbox-page">
        <div className="swarm-inbox-header">
          <div className="swarm-inbox-title">
            <h1>Inbox</h1>
            <span className="swarm-inbox-count">
              {ranked ? `${ranked.length} ranked` : 'Loading…'}
            </span>
          </div>
          <div className="swarm-inbox-subtitle">
            Sorted by estimated visibility lift × confidence. Click any row to draft.
          </div>
        </div>

        {ranked === null ? (
          <div className="swarm-inbox-empty">Loading inbox…</div>
        ) : error ? (
          <div className="swarm-inbox-empty">
            Couldn't reach Supabase: {error}.{' '}
            <Link to="/settings">Check connection</Link>
          </div>
        ) : tasks && tasks.length === 0 ? (
          <div className="swarm-inbox-empty">
            Run agents to populate your inbox.{' '}
            <Link to="/settings">Open Settings</Link>
          </div>
        ) : ranked.length === 0 ? (
          <div className="swarm-inbox-empty">
            No tasks match this filter yet.
          </div>
        ) : (
          <div className="swarm-inbox-list" role="list">
            {ranked.map((t) => (
              <InboxRow
                key={t.id}
                task={t}
                selected={t.id === selectedId}
                onSelect={() => setSelectedId(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDrawer task={selected} draft={draftForSelected} onClose={() => setSelectedId(null)} />
    </>
  );
}

function countByKind(tasks: InboxTask[]): Record<TaskKind | 'all', number> {
  const out: Record<TaskKind | 'all', number> = {
    all: tasks.length,
    trend: 0,
    opportunity: 0,
    outdated_content: 0,
    mention: 0,
  };
  for (const t of tasks) out[t.kind] += 1;
  return out;
}

// ---------------------------------------------------------------------------
// DB row → UI shape mappers. The DB schema allows nulls in places the UI
// contract treats as required, so we coerce here at the boundary.
// ---------------------------------------------------------------------------

function toInboxTask(row: TaskRow): InboxTask {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  // Seed writes `content` for the post body; legacy data may use `body`.
  const body =
    typeof raw.body === 'string'
      ? (raw.body as string)
      : typeof raw.content === 'string'
        ? (raw.content as string)
        : undefined;
  const author = typeof raw.author === 'string' ? (raw.author as string) : undefined;
  const publishedAt = typeof raw.published_at === 'string' ? (raw.published_at as string) : undefined;

  return {
    id: row.id,
    kind: row.kind,
    status: (row.status as InboxTask['status']) ?? 'open',
    title: row.title,
    summary: row.summary ?? '',
    source_url: row.source_url,
    source_domain: row.source_domain ?? domainFromUrl(row.source_url),
    platform: row.platform,
    related_topic_id: row.related_topic_id,
    estimated_lift: row.estimated_lift ?? 0,
    score: row.score ?? 0,
    created_at: row.created_at,
    raw: body || author || publishedAt ? { body, author, published_at: publishedAt } : undefined,
  };
}

function toInboxDraft(row: DraftRow): InboxDraft {
  return {
    id: row.id,
    task_id: row.task_id,
    opener: row.opener ?? '',
    angle: row.angle ?? '',
    supporting: row.supporting ?? '',
    cta: row.cta ?? '',
    // Drafts table only stores chunk IDs; the citation strip stays empty until
    // a join query lands. TaskDrawer renders gracefully with zero citations.
    context_chunks: [],
  };
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
