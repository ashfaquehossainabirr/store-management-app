import Modal from './Modal';

export default function ConfirmModal({ title = 'Are you sure?', message, confirmLabel = 'Confirm', danger = true, onConfirm, onClose, busy }) {
  return (
    <Modal title={title} onClose={onClose} width={380}>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
        {message}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
