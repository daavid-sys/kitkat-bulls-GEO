import type { ConversationOpportunity } from '../../types';

export function ConversationCard({
  opportunity,
  onOpen,
}: {
  opportunity: ConversationOpportunity;
  onOpen: () => void;
}) {
  return (
    <div
      className="peec-row p-3.5"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <PlatformGlyph platform={opportunity.platform} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <ConnectionBadge type={opportunity.connectionType} />
            <span className="peec-eyebrow" style={{ color: 'var(--peec-fg-quaternary)' }}>·</span>
            <span
              className="text-[11px] font-medium"
              style={{ color: 'var(--peec-fg-tertiary)' }}
            >
              {opportunity.author}
            </span>
            <span className="peec-eyebrow" style={{ color: 'var(--peec-fg-quaternary)' }}>·</span>
            <span
              className="text-[11px] font-medium"
              style={{ color: 'var(--peec-fg-tertiary)' }}
            >
              {formatRelativeTime(opportunity.publishedAt)}
            </span>
          </div>

          <h3 className="t-body-m mb-1 leading-snug" style={{ fontWeight: 600 }}>
            {opportunity.title}
          </h3>
          <p
            className="text-[12.5px] leading-[18px] line-clamp-2"
            style={{ color: 'var(--peec-fg-secondary)', letterSpacing: '-0.065px' }}
          >
            {opportunity.content}
          </p>

          <div
            className="rounded-[8px] px-2.5 py-2 mt-2.5 flex items-start gap-2"
            style={{
              background: '#155dfc0a',
              boxShadow: 'inset 0 0 0 1px #155dfc1f',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              className="mt-[2px] flex-shrink-0"
              style={{ color: 'var(--peec-feature-2-base)' }}
            >
              <path
                d="M8 1.5L9.6 5.6L14 7.2L9.6 8.8L8 13L6.4 8.8L2 7.2L6.4 5.6L8 1.5Z"
                fill="currentColor"
                fillOpacity="0.18"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span
                  className="peec-eyebrow"
                  style={{ color: 'var(--peec-feature-2-base)' }}
                >
                  Peec impact
                </span>
                <span
                  className="text-[11px] font-semibold tabular-nums"
                  style={{ color: 'var(--peec-feature-2-base)' }}
                >
                  +{opportunity.estimatedVisibilityLift.toFixed(1)}pp
                </span>
              </div>
              <p
                className="text-[12.5px] leading-[17px]"
                style={{ color: 'var(--peec-fg-primary)', letterSpacing: '-0.065px' }}
              >
                {opportunity.peecInsight}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <ScoreChip score={opportunity.relevanceScore} />
          <button
            className="peec-btn peec-btn-primary peec-btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            Draft →
          </button>
        </div>
      </div>
    </div>
  );
}

function PlatformGlyph({ platform }: { platform: ConversationOpportunity['platform'] }) {
  const map = {
    reddit: { letter: 'R', bg: 'var(--peec-bg-secondary)', text: 'var(--peec-badge-orange-text)' },
    linkedin: { letter: 'in', bg: 'var(--peec-bg-secondary)', text: 'var(--peec-badge-blue-text)' },
    x: { letter: '𝕏', bg: 'var(--peec-bg-secondary)', text: 'var(--peec-fg-primary)' },
  } as const;
  const c = map[platform];
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        background: c.bg,
        color: c.text,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '-0.2px',
      }}
    >
      {c.letter}
    </div>
  );
}

function ConnectionBadge({ type }: { type: ConversationOpportunity['connectionType'] }) {
  const colors = {
    direct: { bg: 'var(--peec-badge-green-bg)', text: 'var(--peec-badge-green-text)' },
    adjacent: { bg: 'var(--peec-badge-violet-bg)', text: 'var(--peec-badge-violet-text)' },
    cultural: { bg: 'var(--peec-badge-pink-bg)', text: 'var(--peec-badge-pink-text)' },
  } as const;
  const c = colors[type];
  return (
    <span
      className="peec-pill"
      style={{
        background: c.bg,
        color: c.text,
        borderColor: 'transparent',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 600,
        fontSize: 10,
        padding: '1px 7px',
      }}
    >
      {type}
    </span>
  );
}

function ScoreChip({ score }: { score: number }) {
  const palette =
    score >= 85
      ? { bg: 'var(--peec-badge-green-bg)', text: 'var(--peec-badge-green-text)' }
      : { bg: 'var(--peec-bg-secondary)', text: 'var(--peec-fg-secondary)' };
  return (
    <span
      className="peec-pill tabular-nums"
      style={{
        background: palette.bg,
        color: palette.text,
        borderColor: 'transparent',
        fontWeight: 600,
      }}
      title={`Relevance ${score}/100`}
    >
      {score}
    </span>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
