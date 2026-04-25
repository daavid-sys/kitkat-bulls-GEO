import type { TaskKind } from './InboxRow';

export type KindFilter = TaskKind | 'all';

const FILTERS: ReadonlyArray<{ value: KindFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'trend', label: 'Trends' },
  { value: 'outdated_content', label: 'Outdated' },
  { value: 'mention', label: 'Mentions' },
];

export function FilterBar({
  value,
  onChange,
  counts,
}: {
  value: KindFilter;
  onChange: (v: KindFilter) => void;
  counts: Record<KindFilter, number> | null;
}) {
  return (
    <div className="swarm-filter-bar" role="tablist" aria-label="Filter tasks by kind">
      {FILTERS.map((f) => {
        const c = counts?.[f.value];
        return (
          <button
            key={f.value}
            role="tab"
            aria-selected={value === f.value}
            className={'swarm-filter-pill' + (value === f.value ? ' is-active' : '')}
            onClick={() => onChange(f.value)}
          >
            {f.label}
            {c !== undefined && <span style={{ opacity: 0.6 }}>·{c}</span>}
          </button>
        );
      })}
    </div>
  );
}
