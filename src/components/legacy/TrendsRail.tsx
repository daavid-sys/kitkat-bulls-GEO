import type { Trend, VisibilityGap } from '../../types';

export function TrendsRail({
  trends,
  gaps,
  onTopicClick,
}: {
  trends: Trend[];
  gaps: VisibilityGap[];
  onTopicClick: (topicId: string) => void;
}) {
  return (
    <aside className="peec-card overflow-hidden sticky top-[60px] max-h-[calc(100vh-72px)] flex flex-col">
      <div className="peec-section-head">
        <h2 className="t-h4">Weekly trends</h2>
        <span
          className="peec-eyebrow"
          style={{ color: 'var(--peec-fg-tertiary)' }}
        >
          Trends agent
        </span>
      </div>

      <div className="flex flex-col p-1.5 gap-1 overflow-y-auto">
        {trends.map((t) => {
          const gap = gaps.find((g) => g.topicId === t.relatedTopicId);
          return (
            <button
              key={t.id}
              onClick={() => onTopicClick(t.relatedTopicId)}
              className="peec-row text-left p-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span
                  className="peec-pill"
                  style={{
                    background: 'var(--peec-bg-secondary)',
                    color: 'var(--peec-fg-secondary)',
                    borderColor: 'transparent',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                    fontSize: 9.5,
                    padding: '1px 6px',
                  }}
                >
                  {t.surface}
                </span>
                {gap && (
                  <span
                    className="peec-pill tabular-nums"
                    style={{
                      background:
                        gap.visibility < 25
                          ? 'var(--peec-badge-rose-bg)'
                          : 'var(--peec-bg-secondary)',
                      color:
                        gap.visibility < 25
                          ? 'var(--peec-badge-rose-text)'
                          : 'var(--peec-fg-secondary)',
                      borderColor: 'transparent',
                      fontWeight: 600,
                      fontSize: 10,
                      padding: '1px 6px',
                    }}
                  >
                    {Math.round(gap.visibility)}%
                  </span>
                )}
              </div>
              <h3 className="t-body-s mb-1" style={{ fontWeight: 600 }}>
                {t.title}
              </h3>
              <p
                className="text-[12px] leading-[16px] line-clamp-2"
                style={{ color: 'var(--peec-fg-secondary)', letterSpacing: '-0.05px' }}
              >
                {t.description}
              </p>
              <div
                className="mt-2 flex items-center gap-1 text-[11px] font-medium"
                style={{ color: 'var(--peec-feature-2-base)' }}
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 11L8 6L13 11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="tabular-nums">+{t.expectedLiftPp}pp</span>
                <span style={{ color: 'var(--peec-fg-tertiary)' }}>
                  on {gap?.topicName ?? 'topic'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
