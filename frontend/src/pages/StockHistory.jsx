import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, History } from 'lucide-react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import api from '../api/axios';

export default function StockHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api
      .get('/stock-adjustments', { params: { type: type || undefined, page, limit: 20 } })
      .then((res) => {
        setItems(res.data.items);
        setPages(res.data.pages || 1);
      })
      .finally(() => setLoading(false));
  }, [type, page]);

  useEffect(() => setPage(1), [type]);

  return (
    <PageShell
      title="Stock History"
      subtitle="Every manual stock adjustment, with who made it and why."
      actions={<Link to="/products" className="btn"><ArrowLeft size={15} /> Back to Products</Link>}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">All adjustments</option>
          <option value="increase">Increases</option>
          <option value="decrease">Decreases</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><History size={28} style={{ opacity: 0.4, marginBottom: 10 }} /><div>No stock adjustments recorded yet.</div></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Change</th>
                  <th className="hide-mobile">Stock</th>
                  <th className="hide-mobile">Reason</th>
                  <th className="hide-mobile">By</th>
                  <th style={{ textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.productName}<div className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a.sku}</div></td>
                    <td>
                      <span
                        className="badge"
                        style={
                          a.type === 'increase'
                            ? { color: 'var(--status-delivered)', background: 'color-mix(in srgb, var(--status-delivered) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--status-delivered) 40%, transparent)' }
                            : { color: 'var(--status-cancelled)', background: 'var(--chip-overdue-bg)', border: '1px solid var(--chip-overdue-border)' }
                        }
                      >
                        {a.quantityChange > 0 ? '+' : ''}{a.quantityChange}
                      </span>
                    </td>
                    <td className="hide-mobile mono" style={{ color: 'var(--text-secondary)' }}>{a.previousStock} → {a.newStock}</td>
                    <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{a.reason || '—'}</td>
                    <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{a.adjustedByName}</td>
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
