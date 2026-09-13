import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/currency';
import { downloadBlob } from '../utils/download';

const statusStyle = {
  paid: { color: 'var(--status-delivered)', bg: 'color-mix(in srgb, var(--status-delivered) 14%, transparent)', border: 'color-mix(in srgb, var(--status-delivered) 40%, transparent)' },
  partial: { color: 'var(--status-hold)', bg: 'var(--chip-urgent-bg)', border: 'var(--chip-urgent-border)' },
  due: { color: 'var(--status-cancelled)', bg: 'var(--chip-overdue-bg)', border: 'var(--chip-overdue-border)' },
};

export default function Invoices() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [symbol, setSymbol] = useState('$');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings').then((res) => setSymbol(res.data.currencySymbol || '$'));
  }, []);

  const load = () => {
    setLoading(true);
    api
      .get('/sales', { params: { search: debouncedSearch, paymentStatus, page, limit: 15 } })
      .then((res) => {
        setItems(res.data.items);
        setPages(res.data.pages || 1);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [debouncedSearch, paymentStatus, page]);
  useEffect(() => setPage(1), [debouncedSearch, paymentStatus]);

  const downloadPdf = (sale) => downloadBlob(api.get(`/sales/${sale._id}/pdf`, { responseType: 'blob' }), `${sale.invoiceNumber}.pdf`);

  const confirmDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/sales/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete invoice');
      setDeleting(null);
    } finally { setBusy(false); }
  };

  return (
    <PageShell title="Invoices" subtitle="Every sale, with a downloadable PDF receipt.">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoice #, customer…" />
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">All payment statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="due">Due</option>
        </select>
      </div>

      {error && !deleting && <div style={{ color: 'var(--text-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><Receipt size={28} style={{ opacity: 0.4, marginBottom: 10 }} /><div>No invoices found.</div></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th className="hide-mobile">Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => {
                  const st = statusStyle[s.paymentStatus] || statusStyle.paid;
                  return (
                    <tr key={s._id}>
                      <td><Link to={`/invoices/${s._id}`} className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{s.invoiceNumber}</Link></td>
                      <td>{s.customerName}</td>
                      <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td><span className="badge" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{s.paymentStatus}{s.status === 'cancelled' ? ' · void' : ''}</span></td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatMoney(s.total, symbol)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-sm" onClick={() => downloadPdf(s)} title="Download PDF" style={{ marginRight: canManage ? 6 : 0 }}><Download size={13} /></button>
                        {canManage && (
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleting(s)} title="Delete invoice"><Trash2 size={13} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {deleting && (
        <ConfirmModal
          title="Delete this invoice?"
          message={
            deleting.status === 'cancelled'
              ? `This will permanently delete "${deleting.invoiceNumber}". This cannot be undone.`
              : `This will permanently delete "${deleting.invoiceNumber}" and restock its items back into inventory. This cannot be undone.`
          }
          confirmLabel="Delete Invoice"
          busy={busy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </PageShell>
  );
}
