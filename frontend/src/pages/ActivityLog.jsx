import { useEffect, useState } from 'react';
import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import api from '../api/axios';

const ACTION_LABELS = {
  login: 'Logged in',
  sale_void: 'Voided invoice',
  sale_refund: 'Refunded invoice',
  sale_delete: 'Deleted invoice',
  purchase_cancel: 'Cancelled purchase order',
  purchase_delete: 'Deleted purchase order',
  user_create: 'Created user',
  user_role_change: 'Changed user role',
  user_activate: 'Activated user',
  user_deactivate: 'Deactivated user',
  user_delete: 'Deleted user',
};

const ACTION_COLOR = {
  login: 'var(--status-delivered)',
  sale_void: 'var(--status-hold)',
  sale_refund: 'var(--status-hold)',
  sale_delete: 'var(--status-cancelled)',
  purchase_cancel: 'var(--status-hold)',
  purchase_delete: 'var(--status-cancelled)',
  user_create: 'var(--status-delivered)',
  user_role_change: 'var(--accent-violet)',
  user_activate: 'var(--status-delivered)',
  user_deactivate: 'var(--status-hold)',
  user_delete: 'var(--status-cancelled)',
};

export default function ActivityLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api
      .get('/activity-log', { params: { action: action || undefined, page, limit: 25 } })
      .then((res) => {
        setItems(res.data.items);
        setPages(res.data.pages || 1);
      })
      .finally(() => setLoading(false));
  }, [action, page]);

  useEffect(() => setPage(1), [action]);

  return (
    <PageShell title="Activity Log" subtitle="An audit trail of sensitive actions taken across the store.">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <select value={action} onChange={(e) => setAction(e.target.value)} style={{ width: 'auto', minWidth: 180 }}>
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><ShieldCheck size={28} style={{ opacity: 0.4, marginBottom: 10 }} /><div>No activity recorded yet.</div></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Item</th>
                  <th className="hide-mobile">Details</th>
                  <th className="hide-mobile">By</th>
                  <th style={{ textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <span
                        className="badge"
                        style={{
                          color: ACTION_COLOR[a.action] || 'var(--text-secondary)',
                          background: `color-mix(in srgb, ${ACTION_COLOR[a.action] || 'var(--text-secondary)'} 14%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${ACTION_COLOR[a.action] || 'var(--text-secondary)'} 40%, transparent)`,
                        }}
                      >
                        {ACTION_LABELS[a.action] || a.action}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.entityLabel || '—'}</td>
                    <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{a.details || '—'}</td>
                    <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{a.userName}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', marginTop: 18 }}>
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {pages}</span>
              <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
