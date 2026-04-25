import type { VoiceProfile } from '../../types';
import type { PeecDomainReportRow } from '../../services/peec';

export function VoiceProfilePanel({
  voice,
  topDomains,
}: {
  voice: VoiceProfile;
  topDomains: PeecDomainReportRow[];
}) {
  const ugc = topDomains.filter((d) => d.type === 'UGC').slice(0, 4);
  return (
    <aside className="flex flex-col gap-3 sticky top-[60px] max-h-[calc(100vh-72px)] overflow-y-auto pr-0.5">
      <div className="peec-card overflow-hidden">
        <div className="peec-section-head">
          <h2 className="t-h4">Brand voice</h2>
          <span
            className="peec-eyebrow"
            style={{ color: 'var(--peec-fg-tertiary)' }}
          >
            Context agent
          </span>
        </div>
        <div className="px-3 py-3">
          <p
            className="text-[12.5px] leading-[18px] mb-2.5"
            style={{ color: 'var(--peec-fg-primary)', letterSpacing: '-0.065px' }}
          >
            {voice.summary}
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {voice.traits.slice(0, 5).map((t) => (
              <span
                key={t}
                className="peec-pill"
                style={{
                  background: 'var(--peec-bg-secondary)',
                  color: 'var(--peec-fg-primary)',
                  borderColor: 'transparent',
                  fontSize: 10.5,
                  padding: '1px 7px',
                  fontWeight: 500,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="peec-divider mb-3" />

          <div className="peec-eyebrow mb-2">Tone</div>
          <div className="flex flex-col gap-1.5 mb-3">
            {Object.entries(voice.toneSpectrum).map(([k, v]) => (
              <ToneBar key={k} label={k} value={v} />
            ))}
          </div>

          <div className="peec-divider mb-3" />

          <div className="peec-eyebrow mb-2">Signature phrases</div>
          <ul className="flex flex-col gap-1 mb-3">
            {voice.signaturePhrases.slice(0, 3).map((p) => (
              <li
                key={p}
                className="text-[12px] leading-[16px] italic"
                style={{ color: 'var(--peec-fg-secondary)', letterSpacing: '-0.05px' }}
              >
                "{p}"
              </li>
            ))}
          </ul>

          <div className="peec-divider mb-3" />

          <div className="peec-eyebrow mb-2">Brand context</div>
          <p
            className="text-[12px] leading-[16px]"
            style={{ color: 'var(--peec-fg-secondary)', letterSpacing: '-0.05px' }}
          >
            {voice.brandContextSummary}
          </p>
        </div>
      </div>

      {ugc.length > 0 && (
        <div className="peec-card overflow-hidden">
          <div className="peec-section-head">
            <h2 className="t-h4">Where AI cites you</h2>
            <span
              className="peec-eyebrow"
              style={{ color: 'var(--peec-fg-tertiary)' }}
            >
              UGC sources
            </span>
          </div>
          <div className="flex flex-col">
            {ugc.map((d, i) => (
              <div
                key={d.domain}
                className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-[var(--peec-table-hover)]"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--peec-separator-primary)',
                }}
              >
                <span className="t-body-s truncate">{d.domain}</span>
                <span
                  className="text-[11px] tabular-nums font-medium"
                  style={{ color: 'var(--peec-fg-tertiary)' }}
                >
                  {d.citation_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function ToneBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="text-[11px] capitalize font-medium"
        style={{ color: 'var(--peec-fg-secondary)', minWidth: 70 }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--peec-bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${value}%`, background: 'var(--peec-bg-black)' }}
        />
      </div>
      <span
        className="text-[10.5px] tabular-nums font-medium"
        style={{ color: 'var(--peec-fg-tertiary)', minWidth: 22, textAlign: 'right' }}
      >
        {value}
      </span>
    </div>
  );
}
