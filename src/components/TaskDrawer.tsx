import { useEffect } from 'react';
import {
  KindIcon,
  kindLabel,
  type InboxTask,
  type InboxDraft,
  type TaskKind,
} from './InboxRow';

export function TaskDrawer({
  task,
  draft,
  onClose,
}: {
  task: InboxTask | null;
  draft: InboxDraft | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, onClose]);

  if (!task) return null;

  const citations = (draft?.context_chunks ?? []).slice(0, 3);
  const body = task.raw?.body ?? task.summary;
  const author = task.raw?.author ?? null;
  const publishedAt = task.raw?.published_at ?? task.created_at;

  return (
    <>
      <div className="swarm-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className="swarm-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Task detail"
      >
        <div className="swarm-drawer-head">
          <div className="swarm-drawer-head-left">
            <span className={`swarm-drawer-kind-pill ${kindPillClass(task.kind)}`}>
              <KindIcon kind={task.kind} />
              {kindLabel(task.kind)}
            </span>
            <span className="swarm-drawer-title" title={task.title}>
              {task.title}
            </span>
          </div>
          <div className="swarm-drawer-head-right">
            <a
              className="swarm-drawer-source-link"
              href={task.source_url}
              target="_blank"
              rel="noreferrer"
              title={task.source_url}
            >
              Open source
              <ExternalIcon />
            </a>
            <button className="swarm-drawer-close" onClick={onClose} aria-label="Close drawer">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="swarm-drawer-body">
          <div className="swarm-drawer-pane">
            <div className="swarm-drawer-pane-head">
              <span className="swarm-drawer-pane-title">Original</span>
              <span className="swarm-drawer-pane-sub">
                {task.platform ? task.platform + ' · ' : ''}
                {task.source_domain}
              </span>
            </div>

            {author && (
              <div className="swarm-drawer-author">
                <span className="swarm-drawer-author-avatar">
                  {author.charAt(0).toUpperCase()}
                </span>
                <span>{author}</span>
                <span className="swarm-row-meta-sep">·</span>
                <span style={{ color: 'var(--peec-fg-tertiary)' }}>{formatDate(publishedAt)}</span>
              </div>
            )}

            <div className="swarm-drawer-post-body">{body}</div>
          </div>

          <div className="swarm-drawer-pane">
            <div className="swarm-drawer-pane-head">
              <span className="swarm-drawer-pane-title">Draft scaffold</span>
              <span className="swarm-drawer-pane-sub">
                {draft ? 'Generated' : 'Empty'}
              </span>
            </div>

            {draft ? (
              <>
                <DraftField label="Opener" text={draft.opener} />
                <DraftField label="Angle" text={draft.angle} />
                <DraftField label="Supporting" text={draft.supporting} />
                <DraftField label="CTA" text={draft.cta} />
              </>
            ) : (
              <div className="swarm-drawer-empty">
                No draft yet. Generate one once the interception agent finishes.
              </div>
            )}
          </div>
        </div>

        <div className="swarm-drawer-citations">
          <div className="swarm-drawer-citations-title">
            Brand context citations · {citations.length} of {draft?.context_chunks.length ?? 0}
          </div>
          {citations.length === 0 ? (
            <div className="swarm-drawer-empty">No retrieved chunks for this task.</div>
          ) : (
            citations.map((c, i) => (
              <div className="swarm-drawer-citation" key={c.id}>
                <span className="swarm-drawer-citation-index">{i + 1}</span>
                <div className="swarm-drawer-citation-body">
                  <div className="swarm-drawer-citation-text">{c.text}</div>
                  <a
                    className="swarm-drawer-citation-source"
                    href={c.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {c.source_type} · {hostnameOf(c.source_url)}
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

function DraftField({ label, text }: { label: string; text: string }) {
  return (
    <div className="swarm-drawer-draft-field">
      <div className="swarm-drawer-draft-label">{label}</div>
      <div className="swarm-drawer-draft-text">{text}</div>
    </div>
  );
}

function kindPillClass(kind: TaskKind): string {
  switch (kind) {
    case 'trend':
      return 'is-trend-pill';
    case 'opportunity':
      return 'is-opportunity-pill';
    case 'outdated_content':
      return 'is-outdated-pill';
    case 'mention':
      return 'is-mention-pill';
  }
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
