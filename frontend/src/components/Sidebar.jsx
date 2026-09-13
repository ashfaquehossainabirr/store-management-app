import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import Modal from './Modal';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Users,
  Truck,
  ClipboardList,
  Receipt,
  UserCog,
  Settings,
  ChevronLeft,
  LogOut,
  X,
  Boxes,
} from 'lucide-react';

const COLLAPSE_KEY = 'sf-sidebar-collapsed';

const linkStyle = ({ isActive }) => ({
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  background: isActive ? 'var(--bg-panel-raised)' : 'transparent',
  border: isActive ? '1px solid var(--border-hairline)' : '1px solid transparent',
});

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    onClose && onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const navSections = [
    {
      items: [
        { to: '/', end: true, label: 'Dashboard', Icon: LayoutDashboard },
        { to: '/pos', label: 'Point of Sale', Icon: ShoppingCart },
        { to: '/invoices', label: 'Invoices', Icon: Receipt },
      ],
    },
    {
      heading: 'Inventory',
      items: [
        { to: '/products', label: 'Products', Icon: Package },
        { to: '/categories', label: 'Categories', Icon: Tags },
        ...(isManager ? [{ to: '/purchases', label: 'Purchase Orders', Icon: ClipboardList }] : []),
      ],
    },
    {
      heading: 'People',
      items: [
        { to: '/customers', label: 'Customers', Icon: Users },
        ...(isManager ? [{ to: '/suppliers', label: 'Suppliers', Icon: Truck }] : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            heading: 'Admin',
            items: [
              { to: '/users', label: 'Team & Access', Icon: UserCog },
              { to: '/settings', label: 'Store Settings', Icon: Settings },
            ],
          },
        ]
      : []),
  ];

  const initials = (user?.name || '?')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Boxes size={15} />
            </div>
            <span className="sidebar-brand-name">
              Store<span className="sidebar-brand-accent">Flow</span>
            </span>
          </div>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-tooltip={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft size={13} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }} />
          </button>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={17} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section, idx) => (
            <div className="nav-section" key={section.heading || `main-${idx}`}>
              {section.heading && !collapsed && <div className="nav-section-heading">{section.heading}</div>}
              {section.items.map(({ to, end, label, Icon }) => (
                <NavLink key={to} to={to} end={end} style={linkStyle} className="nav-link" data-tooltip={label}>
                  <span className="nav-icon">
                    <Icon size={18} />
                  </span>
                  <span className="nav-label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-extras">
            <div style={{ marginBottom: 10 }}>
              <ThemeToggle compact={collapsed} />
            </div>
          </div>

          <div className="sidebar-user" data-tooltip={`${user?.name || ''} · ${user?.role || ''}`}>
            <div className="user-avatar">{initials}</div>
            <div className="user-meta">
              <span className="user-name">{user?.name}</span>
              <span
                className="mono user-role"
                style={{
                  color:
                    user?.role === 'admin' ? 'var(--accent-cyan)' : user?.role === 'manager' ? 'var(--status-hold)' : 'var(--text-muted)',
                }}
              >
                {user?.role}
              </span>
            </div>
          </div>

          <button className="signout-btn" onClick={() => setShowLogoutConfirm(true)} data-tooltip="Sign out">
            <LogOut size={16} />
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <Modal title="Sign out?" onClose={() => setShowLogoutConfirm(false)} width={360}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
            You'll need to log back in with your email and password to continue.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={logout}>
              Sign out
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .sidebar {
          --sidebar-w: 232px;
          --sidebar-w-collapsed: 76px;
          width: var(--sidebar-w);
          flex-shrink: 0;
          background: var(--bg-panel);
          border-right: 1px solid var(--border-hairline-soft);
          box-shadow: 3px 0 18px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          padding: 20px 14px;
          height: 100vh;
          height: 100dvh;
          position: sticky;
          top: 0;
          overflow: visible;
          transition: width 0.22s ease;
        }
        .sidebar.sidebar-collapsed { width: var(--sidebar-w-collapsed); }

        .sidebar-collapse-toggle {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        }
        .sidebar-collapse-toggle:hover { color: var(--accent-cyan); border-color: var(--accent-cyan-dim); background: var(--bg-panel-raised); transform: scale(1.08); }
        .sidebar-collapse-toggle:active { transform: scale(0.96); }

        .sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 26px; flex-shrink: 0; }
        .sidebar-brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
        .sidebar-logo {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
          display: flex; align-items: center; justify-content: center; color: var(--text-on-accent);
        }
        .sidebar-brand-name { font-family: var(--font-display); font-weight: 700; font-size: 17px; letter-spacing: -0.01em; white-space: nowrap; }
        .sidebar-brand-accent { color: var(--accent-cyan); }
        .sidebar-collapsed .sidebar-head { flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 4px 0 18px; }
        .sidebar-collapsed .sidebar-brand-name { display: none; }

        .sidebar-nav {
          flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;
          display: flex; flex-direction: column; gap: 3px; padding-right: 2px;
          scrollbar-width: thin; scrollbar-color: var(--border-hairline) transparent;
        }
        .sidebar-nav::-webkit-scrollbar { width: 6px; height: 6px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: var(--border-hairline); border-radius: 10px; }
        .nav-section { display: flex; flex-direction: column; gap: 3px; }
        .nav-section + .nav-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-hairline-soft); }
        .nav-section-heading { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); padding: 4px 12px 6px; }
        .nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; font-size: 14px; font-weight: 500; white-space: nowrap; }
        .nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nav-label { overflow: hidden; text-overflow: ellipsis; }
        .sidebar-collapsed .nav-link { justify-content: center; padding: 10px; }
        .sidebar-collapsed .nav-label { display: none; }

        .sidebar-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-hairline-soft); flex-shrink: 0; }
        .sidebar-collapsed .footer-extras { display: none; }
        .sidebar-user { padding: 8px; display: flex; align-items: center; gap: 10px; }
        .user-avatar {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-inset); border: 1px solid var(--border-hairline); color: var(--text-secondary);
          font-size: 11.5px; font-weight: 700; font-family: var(--font-mono);
        }
        .user-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .user-name { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
        .sidebar-collapsed .sidebar-user { justify-content: center; padding: 8px 0; }
        .sidebar-collapsed .user-meta { display: none; }
        .signout-btn {
          width: 100%; margin-top: 8px; padding: 9px 12px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border-hairline); color: var(--text-secondary);
          font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .sidebar-collapsed .signout-btn { padding: 9px; }

        .sidebar-collapsed [data-tooltip] { position: relative; }
        .sidebar-collapsed [data-tooltip]::after {
          content: attr(data-tooltip); position: absolute; left: calc(100% + 12px); top: 50%;
          transform: translateY(-50%) translateX(-6px);
          background: var(--bg-panel-raised); color: var(--text-primary); border: 1px solid var(--border-hairline);
          padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap;
          opacity: 0; pointer-events: none; transition: opacity 0.15s ease, transform 0.15s ease; z-index: 260;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
        }
        .sidebar-collapsed [data-tooltip]:hover::after, .sidebar-collapsed [data-tooltip]:focus-visible::after {
          opacity: 1; transform: translateY(-50%) translateX(0);
        }

        .sidebar-close-btn { display: none; background: transparent; border: none; color: var(--text-muted); align-items: center; justify-content: center; cursor: pointer; padding: 4px 8px; }
        .sidebar-overlay { display: none; }
        @media (max-width: 900px) {
          .sidebar {
            position: fixed; top: 0; left: 0; width: var(--sidebar-w) !important;
            transform: translateX(-100%); transition: transform 0.25s ease, box-shadow 0.25s ease;
            z-index: 210; box-shadow: none; overflow: hidden !important;
          }
          .sidebar-open { transform: translateX(0); box-shadow: 6px 0 28px rgba(0, 0, 0, 0.28); }
          .sidebar-collapse-toggle { display: none; }
          .sidebar-collapsed [data-tooltip]::after { display: none; }
          .sidebar-collapsed .sidebar-brand-name, .sidebar-collapsed .nav-label { display: inline; }
          .sidebar-collapsed .footer-extras { display: block; }
          .sidebar-collapsed .user-meta { display: flex; }
          .sidebar-collapsed .sidebar-head { flex-direction: row; justify-content: space-between; padding-left: 8px; padding-right: 8px; padding-bottom: 26px; }
          .sidebar-collapsed .nav-link { justify-content: flex-start; padding: 10px 14px; }
          .sidebar-collapsed .sidebar-user { justify-content: flex-start; padding: 8px; }
          .sidebar-collapsed .signout-btn { justify-content: center; padding: 9px 12px; }
          .sidebar-close-btn { display: inline-flex; }
          .sidebar-overlay { display: block; position: fixed; inset: 0; background: var(--overlay-scrim); z-index: 200; }
        }
        @media (max-width: 480px) {
          .sidebar { width: min(var(--sidebar-w), 82vw) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar, .sidebar-collapse-toggle { transition: none; }
        }
      `}</style>
    </>
  );
}
