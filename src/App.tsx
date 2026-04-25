import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AppHeader, type ApiStatus } from './components/Header';
import { Inbox } from './pages/Inbox';
import './styles/swarm.css';

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

function Shell() {
  return (
    <div className="swarm-shell">
      <Sidebar brandName="Attio" />
      <div className="swarm-main">
        <RouteHeader />
        <main className="swarm-content">
          <Routes>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/trends" element={<Placeholder title="Trends" />} />
            <Route path="/sources" element={<Placeholder title="Sources" />} />
            <Route path="/brand" element={<Placeholder title="Brand" />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
            <Route path="/setup" element={<Placeholder title="Setup" />} />
            <Route path="*" element={<Placeholder title="Not found" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function RouteHeader() {
  const { pathname } = useLocation();
  const breadcrumb = breadcrumbFor(pathname);
  // TODO(backend-supabase): replace with real `getApiStatus()` from services/api.ts.
  const status: ApiStatus = { state: 'stub', label: 'Stub data' };
  return <AppHeader breadcrumb={breadcrumb} status={status} />;
}

function breadcrumbFor(pathname: string): ReadonlyArray<string> {
  if (pathname.startsWith('/inbox')) return ['Workspace', 'Inbox'];
  if (pathname.startsWith('/trends')) return ['Workspace', 'Trends'];
  if (pathname.startsWith('/sources')) return ['Intelligence', 'Sources'];
  if (pathname.startsWith('/brand')) return ['Intelligence', 'Brand'];
  if (pathname.startsWith('/settings')) return ['Account', 'Settings'];
  if (pathname.startsWith('/setup')) return ['Setup'];
  return ['SWARM'];
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="swarm-inbox-page">
      <div className="swarm-inbox-header">
        <div className="swarm-inbox-title">
          <h1>{title}</h1>
        </div>
        <div className="swarm-inbox-subtitle">Coming soon — owned by another workstream.</div>
      </div>
    </div>
  );
}
