export default function StatGrid({ children }) {
  return (
    <div className="stat-grid">
      {children}
      <style>{`
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        @media (max-width: 1200px) { .stat-grid { gap: 14px; } }
        @media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
        @media (max-width: 480px) { .stat-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
