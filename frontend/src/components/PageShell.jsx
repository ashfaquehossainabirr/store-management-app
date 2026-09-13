import { useState } from 'react';
import Sidebar from './Sidebar';

export default function PageShell({ title, subtitle, actions, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="page-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
        <span className="mobile-topbar-title">
          Store<span style={{ color: 'var(--accent-cyan)' }}>Flow</span>
        </span>
        <div className="mobile-topbar-spacer" />
      </div>

      <main className="page-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>{subtitle}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>
        </div>
        {children}
      </main>

      <style>{`
        .page-shell { display: flex; min-height: 100vh; }
        .mobile-topbar { display: none; }
        .page-main { flex: 1; padding: 32px 40px; max-width: 1920px; min-width: 0; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .page-title { font-family: var(--font-display); font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
        .hamburger-btn {
          display: flex; flex-direction: column; justify-content: center; gap: 4px; width: 34px; height: 34px;
          background: var(--bg-inset); border: 1px solid var(--border-hairline); border-radius: 8px; cursor: pointer; padding: 0; align-items: center;
        }
        .hamburger-btn span { display: block; width: 16px; height: 2px; background: var(--text-secondary); border-radius: 2px; }
        .mobile-topbar-title { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
        .mobile-topbar-spacer { flex: 1; }
        @media (max-width: 900px) {
          .page-shell { flex-direction: column; }
          .mobile-topbar {
            display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 120;
            background: var(--bg-panel); border-bottom: 1px solid var(--border-hairline-soft); padding: 14px 16px;
          }
          .page-main { padding: 20px 16px 40px; max-width: 100%; }
        }
        @media (max-width: 480px) {
          .page-main { padding: 16px 12px 32px; }
          .page-title { font-size: 21px; }
        }
      `}</style>
    </div>
  );
}
