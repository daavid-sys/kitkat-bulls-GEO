import { useState } from 'react';
import type { ConversationOpportunity } from '../../types';
import type { RadarSnapshot } from '../../services/discovery';
import { ConversationCard } from './ConversationCard';
import { DraftPanel } from './DraftPanel';
import { VisibilityBar } from './VisibilityBar';
import { TrendsRail } from './TrendsRail';
import { VoiceProfilePanel } from './VoiceProfilePanel';

export function Radar({ snapshot }: { snapshot: RadarSnapshot }) {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [openOpp, setOpenOpp] = useState<ConversationOpportunity | null>(null);

  const filtered = activeTopicId
    ? snapshot.opportunities.filter((o) => o.relatedTopicId === activeTopicId)
    : snapshot.opportunities;

  const activeTopicName =
    activeTopicId != null
      ? snapshot.gaps.find((g) => g.topicId === activeTopicId)?.topicName ?? null
      : null;

  return (
    <main className="grid grid-cols-[280px_minmax(0,1fr)_320px] gap-3 p-3 max-w-[1480px] mx-auto items-start">
      <TrendsRail trends={snapshot.trends} gaps={snapshot.gaps} onTopicClick={setActiveTopicId} />

      <section className="flex flex-col gap-3 min-w-0">
        <VisibilityBar
          brand={snapshot.brand.name}
          overall={snapshot.overall}
          gaps={snapshot.gaps}
          activeTopicId={activeTopicId}
          onSelect={setActiveTopicId}
        />
        <Feed
          opportunities={filtered}
          onOpen={setOpenOpp}
          totalCount={snapshot.opportunities.length}
          activeTopicName={activeTopicName}
          onClearFilter={() => setActiveTopicId(null)}
        />
      </section>

      <VoiceProfilePanel voice={snapshot.voice} topDomains={snapshot.topDomains} />

      {openOpp && (
        <DraftPanel
          brand={snapshot.brand}
          voice={snapshot.voice}
          opportunity={openOpp}
          onClose={() => setOpenOpp(null)}
        />
      )}
    </main>
  );
}

function Feed({
  opportunities,
  onOpen,
  totalCount,
  activeTopicName,
  onClearFilter,
}: {
  opportunities: ConversationOpportunity[];
  onOpen: (o: ConversationOpportunity) => void;
  totalCount: number;
  activeTopicName: string | null;
  onClearFilter: () => void;
}) {
  return (
    <div className="peec-card overflow-hidden">
      <div className="peec-section-head">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="t-h4">Conversations</h2>
          <span
            className="peec-pill tabular-nums"
            style={{
              background: 'var(--peec-bg-secondary)',
              color: 'var(--peec-fg-secondary)',
              borderColor: 'transparent',
            }}
          >
            {opportunities.length}
            {opportunities.length !== totalCount ? ` / ${totalCount}` : ''}
          </span>
          {activeTopicName && (
            <button
              className="peec-pill"
              onClick={onClearFilter}
              style={{
                background: 'var(--peec-table-selected)',
                color: 'var(--peec-feature-2-base)',
                borderColor: 'transparent',
              }}
            >
              {activeTopicName} ✕
            </button>
          )}
        </div>
        <span
          className="peec-eyebrow"
          style={{ color: 'var(--peec-fg-tertiary)' }}
        >
          Interception agent · live
        </span>
      </div>

      {opportunities.length === 0 ? (
        <div
          className="px-4 py-12 text-center"
          style={{ color: 'var(--peec-fg-tertiary)' }}
        >
          <p className="t-body-m">No matches for this filter.</p>
          <button
            className="peec-btn peec-btn-secondary peec-btn-sm mt-3"
            onClick={onClearFilter}
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 p-1.5">
          {opportunities.map((o) => (
            <ConversationCard key={o.id} opportunity={o} onOpen={() => onOpen(o)} />
          ))}
        </div>
      )}
    </div>
  );
}
