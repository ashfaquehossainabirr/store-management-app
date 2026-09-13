import { createPortal } from 'react-dom';

export default function Modal({ title, onClose, children, width = 480 }) {
  const modal = (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel"
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-hairline-soft)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 700,
              margin: 0,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
