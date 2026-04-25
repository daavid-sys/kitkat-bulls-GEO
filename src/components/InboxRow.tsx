import '../styles/inbox-row.css';

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
  const roiTier = roi >= 0.3 ? 'high' : roi >= 0.18 ? 'mid' : 'low';
  // Map ROI to a 0-100 fill. 0.5 ROI saturates the bar so demo numbers feel substantial.
  const roiPct = Math.min(100, Math.round((roi / 0.5) * 100));

  return (
    <button
      className={`swarm-row is-rich is-${kindClass(task.kind)}` + (selected ? ' is-selected' : '')}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="irow-rail" aria-hidden="true" />

      <span className={`swarm-row-kind irow-kind is-${kindClass(task.kind)}`} aria-hidden="true">
        <KindIcon kind={task.kind} />
      </span>

      <span className="swarm-row-body irow-body">
        <span className="swarm-row-title irow-title">{task.title}</span>
        <span className="swarm-row-meta irow-meta">
          <span className="irow-platform">
            <PlatformGlyph platform={task.platform} domain={task.source_domain} />
            <span className="irow-platform-label">{platformLabel(task)}</span>
          </span>
          <span className="irow-meta-dot" aria-hidden="true">·</span>
          <span className="irow-domain">{cleanDomain(task.source_domain)}</span>
          <span className="irow-meta-dot" aria-hidden="true">·</span>
          <span className="irow-time-chip">{relativeTime(task.created_at)}</span>
        </span>
      </span>

      <span className="irow-end">
        <span className="irow-spark" aria-hidden="true" title="Topic visibility, last 7 days">
          <Sparkline seed={task.related_topic_id ?? task.id} />
        </span>
        <span className={`irow-roi is-${roiTier}`} title={`Estimated lift × confidence = ${roi.toFixed(2)}`}>
          <span className="irow-roi-track">
            <span className="irow-roi-fill" style={{ width: `${roiPct}%` }} />
          </span>
          <span className="irow-roi-value">
            <BoltIcon />
            +{(task.estimated_lift * 100).toFixed(1)}pp
          </span>
        </span>
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

// ---------- Platform glyphs -------------------------------------------------

type PlatformKey = 'reddit' | 'linkedin' | 'x' | 'editorial' | 'owned' | 'peec' | 'generic';

function detectPlatform(platform: string | null, domain: string): PlatformKey {
  const p = (platform ?? '').toLowerCase();
  const d = domain.toLowerCase();
  if (p.includes('reddit') || d.includes('reddit.com')) return 'reddit';
  if (p.includes('linkedin') || d.includes('linkedin.com')) return 'linkedin';
  if (p === 'x' || p === 'twitter' || d === 'x.com' || d.includes('twitter.com')) return 'x';
  if (p.includes('peec') || d.includes('peec.ai')) return 'peec';
  if (p.includes('owned')) return 'owned';
  if (p.includes('editorial')) return 'editorial';
  return 'generic';
}

function platformLabel(task: InboxTask): string {
  if (task.platform) return task.platform;
  const key = detectPlatform(null, task.source_domain);
  if (key === 'generic') return 'Web';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function cleanDomain(domain: string): string {
  return domain.replace(/^www\./, '');
}

function PlatformGlyph({ platform, domain }: { platform: string | null; domain: string }) {
  const key = detectPlatform(platform, domain);
  const common = { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'currentColor' as const };
  return (
    <span className={`irow-platform-glyph is-${key}`} aria-hidden="true">
      {key === 'reddit' && (
        <svg {...common}>
          <path d="M14.5 8a1.7 1.7 0 0 0-2.88-1.2 7.3 7.3 0 0 0-3.7-1.16l.7-3.13 2.18.49a1.2 1.2 0 1 0 .12-.6L8.4 1.84a.3.3 0 0 0-.36.22l-.83 3.58a7.3 7.3 0 0 0-3.74 1.16A1.7 1.7 0 1 0 2.4 9.5a3 3 0 0 0-.05.6c0 2.04 2.46 3.7 5.5 3.7s5.5-1.66 5.5-3.7a3 3 0 0 0-.05-.6c.4-.3.7-.78.7-1.5ZM5.5 9a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 2.4a3.7 3.7 0 0 1-2.5.85 3.7 3.7 0 0 1-2.5-.85.4.4 0 1 1 .55-.6c.5.45 1.2.7 1.95.7s1.45-.25 1.95-.7a.4.4 0 1 1 .55.6Zm-.5-1.4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
        </svg>
      )}
      {key === 'linkedin' && (
        <svg {...common}>
          <path d="M3.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM2.25 6h2.5v8h-2.5V6ZM6.5 6H9v1.1c.4-.7 1.3-1.3 2.6-1.3 2.2 0 2.9 1.4 2.9 3.4V14h-2.5V9.6c0-1-.4-1.7-1.3-1.7-.9 0-1.45.6-1.45 1.7V14H6.5V6Z" />
        </svg>
      )}
      {key === 'x' && (
        <svg {...common}>
          <path d="M11.7 2h2L9.5 6.85 14.5 14h-3.95L7.4 9.6 3.85 14H1.85l4.5-5.16L1.5 2H5.55l2.85 4.04L11.7 2Zm-1.05 10.7h1.1L5.4 3.25H4.2l6.45 9.45Z" />
        </svg>
      )}
      {key === 'editorial' && (
        <svg {...common}>
          <path d="M2.5 2.5h9a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H4.5a2 2 0 0 1-2-2V2.5Zm1.5 1V12a.5.5 0 0 0 .5.5h6V3.5h-6.5Zm1 1.5h4v1h-4V5Zm0 2h4v1h-4V7Zm0 2h2.5v1H5V9Z" stroke="none" />
        </svg>
      )}
      {key === 'owned' && (
        <svg {...common}>
          <path d="M8 1.5 1.5 6.5l1 .8V13a1 1 0 0 0 1 1H6V9.5h4V14h2.5a1 1 0 0 0 1-1V7.3l1-.8L8 1.5Z" />
        </svg>
      )}
      {key === 'peec' && (
        <svg {...common}>
          <rect x="2" y="2" width="5" height="5" rx="1.4" />
          <rect x="9" y="2" width="5" height="5" rx="1.4" />
          <rect x="2" y="9" width="5" height="5" rx="1.4" />
          <rect x="9" y="9" width="5" height="5" rx="1.4" />
        </svg>
      )}
      {key === 'generic' && (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2.5 8h11M8 2.5c1.8 2 1.8 9 0 11M8 2.5c-1.8 2-1.8 9 0 11" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      )}
    </span>
  );
}

// ---------- Sparkline (deterministic from topic id) -------------------------

function Sparkline({ seed }: { seed: string }) {
  const points = sparkPoints(seed, 7);
  const w = 44;
  const h = 14;
  const stepX = w / (points.length - 1);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.001, max - min);
  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`)).join(' ');
  const last = coords[coords.length - 1];
  const trendUp = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={path} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="1.6" fill={trendUp ? 'var(--peec-success-base)' : 'var(--peec-warning-primary)'} />
    </svg>
  );
}

function sparkPoints(seed: string, n: number): number[] {
  const out: number[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < n; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push((h & 0xffff) / 0xffff);
  }
  return out;
}

function BoltIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
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
