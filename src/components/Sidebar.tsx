import { NavLink } from 'react-router-dom';

const NAV: ReadonlyArray<{
  group: string;
  items: ReadonlyArray<{ to: string; label: string; icon: 'inbox' | 'trends' | 'sources' | 'brand' | 'settings'; badge?: string }>;
}> = [
  {
    group: 'Workspace',
    items: [
      { to: '/inbox', label: 'Inbox', icon: 'inbox', badge: 'New' },
      { to: '/trends', label: 'Trends', icon: 'trends' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { to: '/sources', label: 'Sources', icon: 'sources' },
      { to: '/brand', label: 'Brand', icon: 'brand' },
    ],
  },
  {
    group: 'Account',
    items: [{ to: '/settings', label: 'Settings', icon: 'settings' }],
  },
];

export function Sidebar({ brandName = 'Attio' }: { brandName?: string }) {
  return (
    <aside className="swarm-sidebar">
      <div className="swarm-sidebar-top">
        <button className="swarm-brand-switch" aria-label={`Project: ${brandName}`}>
          <span className="swarm-brand-favicon">{brandName.charAt(0).toUpperCase()}</span>
          <span className="swarm-brand-name">{brandName}</span>
          <Chevron />
        </button>
      </div>

      <nav className="swarm-sidebar-nav" aria-label="Primary">
        {NAV.map((g) => (
          <div key={g.group} className="swarm-sidebar-group">
            <div className="swarm-sidebar-eyebrow">{g.group}</div>
            <ul className="swarm-sidebar-list">
              {g.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      'swarm-sidebar-item' + (isActive ? ' is-active' : '')
                    }
                  >
                    <SidebarIcon kind={item.icon} />
                    <span className="swarm-sidebar-label">{item.label}</span>
                    {item.badge && <span className="swarm-sidebar-badge">{item.badge}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="swarm-sidebar-bottom">
        <div className="swarm-sidebar-widget">
          <div className="swarm-sidebar-widget-head">
            <span className="swarm-sidebar-widget-title">Trends agent</span>
            <span className="swarm-sidebar-widget-meta">2h ago</span>
          </div>
          <div className="swarm-sidebar-progress">
            <div className="swarm-sidebar-progress-fill" style={{ width: '64%' }} />
          </div>
          <div className="swarm-sidebar-widget-sub">8 of 12 weak topics swept</div>
        </div>

        <a
          className="swarm-sidebar-footer-link"
          href="https://docs.peec.ai/mcp/introduction"
          target="_blank"
          rel="noreferrer"
        >
          <img src="/peec-logo.jpg" alt="" className="swarm-sidebar-peec-logo" />
          <span>Powered by Peec AI</span>
          <ExternalIcon />
        </a>
      </div>
    </aside>
  );
}

function SidebarIcon({ kind }: { kind: 'inbox' | 'trends' | 'sources' | 'brand' | 'settings' }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none' as const };
  switch (kind) {
    case 'inbox':
      return (
        <svg {...common}>
          <path
            d="M2 9.5V4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v5h-3l-1 1.5h-4l-1-1.5H2Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M2 9.5V12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 12V9.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case 'trends':
      return (
        <svg {...common}>
          <path d="M2.5 11l3-3.5 2.5 2 4-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 4.5h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'sources':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2.5 8h11M8 2.5c1.7 2 1.7 9 0 11M8 2.5c-1.7 2-1.7 9 0 11" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case 'brand':
      return (
        <svg {...common}>
          <path
            d="M8 2.5l1.6 3.4 3.7.4-2.7 2.6.7 3.7L8 10.8l-3.3 1.8.7-3.7L2.7 6.3l3.7-.4L8 2.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M13.5 8a5.5 5.5 0 0 0-.1-1l1.2-1-1.2-2.1-1.5.5a5.5 5.5 0 0 0-1.7-1l-.3-1.6h-2.4l-.3 1.6a5.5 5.5 0 0 0-1.7 1l-1.5-.5L2.8 6l1.2 1a5.5 5.5 0 0 0 0 2L2.8 10l1.2 2.1 1.5-.5a5.5 5.5 0 0 0 1.7 1l.3 1.6h2.4l.3-1.6a5.5 5.5 0 0 0 1.7-1l1.5.5L14.6 10l-1.2-1c.1-.3.1-.7.1-1Z"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4h6v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
