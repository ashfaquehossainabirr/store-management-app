export default function StatCard({ label, value, sub, icon: Icon, color = 'var(--accent-cyan)' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        {Icon && <Icon size={19} />}
      </div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      <style>{`
        .stat-card {
          display: flex; align-items: flex-start; gap: 14px;
          background: var(--bg-panel); border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg); padding: 18px 20px;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          min-width: 0;
        }
        .stat-card:hover { transform: translateY(-2px); border-color: var(--border-hairline); box-shadow: var(--shadow-card-hover); }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-body { min-width: 0; }
        .stat-value { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .stat-label { font-size: 12px; color: var(--text-muted); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.03em; }
        .stat-sub { font-size: 11.5px; color: var(--text-secondary); margin-top: 4px; }
      `}</style>
    </div>
  );
}
