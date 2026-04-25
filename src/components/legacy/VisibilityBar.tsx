import type { VisibilityGap } from '../../types';
import type { PeecBrandReportRow } from '../../services/peec';
import { PeecGlyph } from '../Header';

export function VisibilityBar({
  brand,
  overall,
  gaps,
  activeTopicId,
  onSelect,
}: {
  brand: string;
  overall: PeecBrandReportRow[];
  gaps: VisibilityGap[];
  activeTopicId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const own = overall.find((b) => b.brand_name === brand);
  const top = [...overall].sort((a, b) => b.visibility - a.visibility)[0];
  const ownVis = own ? Math.round(own.visibility) : null;
  const topVis = top ? Math.round(top.visibility) : null;
  const gap = ownVis != null && topVis != null ? Math.max(0, topVis - ownVis) : null;

  return (
    <div className="peec-card overflow-hidden">
      <div className="peec-section-head">
        <div className="flex items-center gap-2">
          <h2 className="t-h4">Visibility scoreboard</h2>
          <span
            className="peec-pill"
            style={{
              background: 'var(--peec-bg-secondary)',
              color: 'var(--peec-fg-secondary)',
              borderColor: 'transparent',
            }}
          >
            <PeecGlyph size={11} />
            from Peec AI
          </span>
        </div>
        {gap != null && gap > 0 && (
          <span
            className="text-[11px] font-medium tabular-nums"
            style={{ color: 'var(--peec-fg-tertiary)' }}
          >
            Gap to leader: <strong style={{ color: 'var(--peec-error-base)' }}>−{gap}pp</strong>
          </span>
        )}
      </div>

      <div className="px-3 py-3">
        <div className="flex items-end gap-4 mb-3">
          <Stat label={brand} value={ownVis} tone="primary" />
          <span className="text-[14px] font-medium" style={{ color: 'var(--peec-fg-quaternary)' }}>
            vs
          </span>
          <Stat
            label={top && top.brand_name !== brand ? `${top.brand_name} (leader)` : 'Leader'}
            value={topVis}
            tone="muted"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {gaps.map((g) => {
            const palette = colorForVisibility(g.visibility);
            const isActive = g.topicId === activeTopicId;
            return (
              <button
                key={g.topicId}
                className="peec-pill"
                onClick={() => onSelect(isActive ? null : g.topicId)}
                style={{
                  background: isActive ? palette.text : palette.bg,
                  color: isActive ? '#fdfdfd' : palette.text,
                  borderColor: 'transparent',
                  fontWeight: 500,
                  padding: '3px 9px',
                  fontSize: 11.5,
                }}
              >
                <span>{g.topicName}</span>
                <span
                  className="tabular-nums"
                  style={{ opacity: isActive ? 0.85 : 0.7, fontWeight: 600 }}
                >
                  {Math.round(g.visibility)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: 'primary' | 'muted';
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="peec-eyebrow"
        style={{ color: 'var(--peec-fg-tertiary)' }}
      >
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{
          fontSize: tone === 'primary' ? 28 : 22,
          lineHeight: 1,
          fontWeight: 600,
          letterSpacing: '-0.896px',
          color: tone === 'primary' ? 'var(--peec-fg-primary)' : 'var(--peec-fg-tertiary)',
        }}
      >
        {value != null ? `${value}%` : '—'}
      </span>
    </div>
  );
}

function colorForVisibility(v: number): { bg: string; text: string } {
  if (v < 25) return { bg: 'var(--peec-badge-rose-bg)', text: 'var(--peec-badge-rose-text)' };
  if (v < 60) return { bg: 'var(--peec-bg-secondary)', text: 'var(--peec-fg-secondary)' };
  return { bg: 'var(--peec-badge-green-bg)', text: 'var(--peec-badge-green-text)' };
}
