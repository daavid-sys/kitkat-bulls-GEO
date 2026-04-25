export type TaskKind = 'trend' | 'opportunity' | 'outdated_content' | 'mention';

export interface InboxTask {
  id: string;
  kind: TaskKind;
  status: 'open' | 'drafting' | 'sent' | 'dismissed';
  title: string;
  summary: string;
  source_url: string;
  source_domain: string;
  platform: string | null;
  related_topic_id: string | null;
  estimated_lift: number;
  score: number;
  created_at: string;
  raw?: {
    body?: string;
    author?: string;
    published_at?: string;
  };
}

export interface InboxContextChunk {
  id: string;
  source_url: string;
  source_type: string;
  text: string;
}

export interface InboxDraft {
  id: string;
  task_id: string;
  opener: string;
  angle: string;
  supporting: string;
  cta: string;
  context_chunks: InboxContextChunk[];
}

export function InboxRow({
  task,
  selected,
  onSelect,
}: {
  task: InboxTask;
  selected: boolean;
  onSelect: () => void;
}) {
  const roi = task.estimated_lift * task.score;
  const roiTier = roi >= 0.6 ? 'high' : roi >= 0.3 ? 'mid' : 'low';
  return (
    <button
      className={'swarm-row' + (selected ? ' is-selected' : '')}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={`swarm-row-kind is-${kindClass(task.kind)}`} aria-hidden="true">
        <KindIcon kind={task.kind} />
      </span>

      <span className="swarm-row-body">
        <span className="swarm-row-title">{task.title}</span>
        <span className="swarm-row-meta">
          <span className="swarm-row-domain">
            <FaviconDot domain={task.source_domain} />
            {task.source_domain}
          </span>
          <span className="swarm-row-meta-sep">·</span>
          <span className="swarm-row-kind-label">{kindLabel(task.kind)}</span>
          {task.platform && (
            <>
              <span className="swarm-row-meta-sep">·</span>
              <span className="swarm-row-platform">{task.platform}</span>
            </>
          )}
        </span>
      </span>

      <span className="swarm-row-end">
        <span className={`swarm-row-roi ${roiTier === 'high' ? '' : roiTier === 'mid' ? 'is-mid' : 'is-low'}`}>
          <BoltIcon />
          +{(task.estimated_lift * 100).toFixed(1)}pp
        </span>
        <span className="swarm-row-time">{relativeTime(task.created_at)}</span>
      </span>
    </button>
  );
}

function kindClass(kind: TaskKind): string {
  switch (kind) {
    case 'trend':
      return 'trend';
    case 'opportunity':
      return 'opportunity';
    case 'outdated_content':
      return 'outdated';
    case 'mention':
      return 'mention';
  }
}

export function kindLabel(kind: TaskKind): string {
  switch (kind) {
    case 'trend':
      return 'Trend';
    case 'opportunity':
      return 'Opportunity';
    case 'outdated_content':
      return 'Outdated';
    case 'mention':
      return 'Mention';
  }
}

export function KindIcon({ kind }: { kind: TaskKind }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none' as const };
  switch (kind) {
    case 'trend':
      return (
        <svg {...common}>
          <path d="M2.5 11l3-3.5 2.5 2 4-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 4.5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'opportunity':
      return (
        <svg {...common}>
          <path
            d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'outdated_content':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'mention':
      return (
        <svg {...common}>
          <path
            d="M3 4h10v6H7l-3 2.5V10H3V4Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function FaviconDot({ domain }: { domain: string }) {
  const ch = domain.replace(/^www\./, '').charAt(0).toUpperCase();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        borderRadius: 4,
        background: 'var(--peec-bg-tertiary)',
        color: 'var(--peec-fg-secondary)',
        fontSize: 9,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {ch}
    </span>
  );
}

function BoltIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <path d="M9 1L3 9h4l-1 6 6-8H8l1-6z" fill="currentColor" />
    </svg>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
