/**
 * AppHeader — used in the v3 shell where the Sidebar lives at the left.
 * Replaces the v2 SWARM-branded `Header` (which still ships for legacy Radar).
 *
 * Status pill is wired to `getApiStatus()`. The real impl ships from
 * `services/api.ts` (owned by `backend-supabase`). Until then we stub locally.
 */
export type ApiStatus = {
  state: 'ok' | 'stub' | 'error';
  label: string;
};

export function AppHeader({
  breadcrumb,
  status,
  onRefresh,
  refreshing,
}: {
  breadcrumb: ReadonlyArray<string>;
  status: ApiStatus;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <header className="swarm-header">
      <div className="swarm-header-left">
        <div className="swarm-breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((seg, i) => (
            <span
              key={`${seg}-${i}`}
              className={i === breadcrumb.length - 1 ? 'swarm-breadcrumb-current' : undefined}
            >
              {seg}
              {i < breadcrumb.length - 1 && (
                <span className="swarm-breadcrumb-sep" style={{ marginLeft: 6 }}>
                  ›
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5" style={{ display: 'flex', gap: 6 }}>
        <span
          className="swarm-status-pill"
          title={status.label}
          aria-label={`API status: ${status.label}`}
        >
          <span className={`swarm-status-dot${status.state === 'stub' ? ' is-stub' : status.state === 'error' ? ' is-error' : ''}`} />
          {status.label}
        </span>
        {onRefresh && (
          <button
            className="peec-btn peec-btn-ghost peec-btn-sm"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path
                d="M2 8a6 6 0 0 1 10.5-3.97V3a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.32A4.5 4.5 0 0 0 3.5 8a.75.75 0 0 1-1.5 0Z"
                fill="currentColor"
              />
              <path
                d="M14 8a6 6 0 0 1-10.5 3.97V13a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H4.43A4.5 4.5 0 0 0 12.5 8a.75.75 0 0 1 1.5 0Z"
                fill="currentColor"
              />
            </svg>
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        )}
      </div>
    </header>
  );
}

export function Header({
  brandName,
  onRefresh,
  refreshing,
}: {
  brandName: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <header
      className="flex items-center justify-between px-4 h-12 border-b sticky top-0 z-10 backdrop-blur-md"
      style={{
        borderColor: 'var(--peec-separator-primary)',
        background: 'rgba(253, 253, 253, 0.85)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <SwarmMark />
        <span className="swarm-wordmark">SWARM</span>
        <span
          className="hidden sm:inline-block text-[11px] font-medium"
          style={{ color: 'var(--peec-fg-tertiary)', letterSpacing: '-0.05px' }}
        >
          / Conquer every conversation
        </span>
        <span
          className="peec-pill ml-1.5"
          style={{
            background: 'var(--peec-table-selected)',
            color: 'var(--peec-feature-2-base)',
            borderColor: 'transparent',
            fontWeight: 500,
            padding: '3px 9px 3px 7px',
            gap: 6,
            fontSize: 12,
          }}
          title="Built on Peec AI's visibility data"
        >
          <PeecGlyph size={16} />
          Powered by Peec AI
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className="peec-btn peec-btn-ghost peec-btn-sm"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh radar"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path
              d="M2 8a6 6 0 0 1 10.5-3.97V3a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.32A4.5 4.5 0 0 0 3.5 8a.75.75 0 0 1-1.5 0Z"
              fill="currentColor"
            />
            <path
              d="M14 8a6 6 0 0 1-10.5 3.97V13a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H4.43A4.5 4.5 0 0 0 12.5 8a.75.75 0 0 1 1.5 0Z"
              fill="currentColor"
            />
          </svg>
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
        <div
          className="h-5 w-px mx-0.5"
          style={{ background: 'var(--peec-separator-primary)' }}
        />
        <button
          className="peec-btn peec-btn-secondary peec-btn-sm"
          aria-label={`Brand: ${brandName}`}
        >
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{
              width: 16,
              height: 16,
              background: 'var(--peec-bg-black)',
              color: 'var(--peec-fg-primary-white)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            {brandName.charAt(0).toUpperCase()}
          </span>
          {brandName}
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            style={{ color: 'var(--peec-fg-tertiary)' }}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export function PeecGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="1.5" y="3" width="7.5" height="3.5" rx="1.4" fill="currentColor" />
      <rect x="4.5" y="9" width="10" height="3.5" rx="1.4" fill="currentColor" />
    </svg>
  );
}

function SwarmMark() {
  return (
    <span
      className="swarm-logo"
      aria-hidden="true"
      title="SWARM"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
        <circle cx="12" cy="6" r="2.4" fill="currentColor" />
        <circle cx="6" cy="15" r="2.4" fill="currentColor" fillOpacity="0.78" />
        <circle cx="18" cy="15" r="2.4" fill="currentColor" fillOpacity="0.78" />
        <path
          d="M12 8.4L6.5 13.6M12 8.4L17.5 13.6M7.4 16.4H16.6"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
