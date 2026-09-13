import { useEffect, useState } from 'react';
import { Plus, PackageCheck, X, ClipboardList, Ban, Pencil, Trash2, Eye, Download } from 'lucide-react';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/currency';
import { downloadBlob } from '../utils/download';

const statusStyle = {
  pending: { color: 'var(--status-hold)', bg: 'var(--chip-urgent-bg)', border: 'var(--chip-urgent-border)' },
  received: { color: 'var(--status-delivered)', bg: 'color-mix(in srgb, var(--status-delivered) 14%, transparent)', border: 'color-mix(in srgb, var(--status-delivered) 40%, transparent)' },
  cancelled: { color: 'var(--status-cancelled)', bg: 'var(--chip-overdue-bg)', border: 'var(--chip-overdue-border)' },
};

export default function Purchases() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('$');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [supplier, setSupplier] = useState('');
  const [lines, setLines] = useState([]);
  const [shipping, setShipping] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [receiving, setReceiving] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/purchases', { params: { search: debouncedSearch } })
      .then((res) => setItems(res.data.items))
      .finally(() => setLoading(false));
  };

  useEffect(load, [debouncedSearch]);

  useEffect(() => {
    api.get('/suppliers').then((res) => setSuppliers(res.data));
    api.get('/products', { params: { limit: 100 } }).then((res) => setProducts(res.data.items));
    api.get('/settings').then((res) => setSymbol(res.data.currencySymbol || '$'));
  }, []);

  const openNew = () => {
    setEditing(null);
    setSupplier('');
    setLines([{ product: '', quantity: 1, cost: 0 }]);
    setShipping(0);
    setError('');
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setSupplier(p.supplier);
    setLines(p.items.map((it) => ({ product: it.product || '', quantity: it.quantity, cost: it.cost })));
    setShipping(p.shipping || 0);
    setError('');
    setShowForm(true);
  };

  const addLine = () => setLines((l) => [...l, { product: '', quantity: 1, cost: 0 }]);
  const removeLine = (i) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i, field, value) => {
    setLines((l) =>
      l.map((line, idx) => {
        if (idx !== i) return line;
        const next = { ...line, [field]: value };
        if (field === 'product') {
          const p = products.find((pr) => pr._id === value);
          if (p) next.cost = p.costPrice;
        }
        return next;
      })
    );
  };

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.cost) || 0), 0) + Number(shipping || 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const validLines = lines.filter((l) => l.product && Number(l.quantity) > 0);
      if (validLines.length === 0) throw new Error('Add at least one product line');
      const payload = {
        supplier,
        shipping: Number(shipping) || 0,
        items: validLines.map((l) => {
          const p = products.find((pr) => pr._id === l.product);
          return { product: l.product, name: p?.name, sku: p?.sku, quantity: Number(l.quantity), cost: Number(l.cost) };
        }),
      };
      if (editing) {
        await api.put(`/purchases/${editing._id}`, payload);
      } else {
        await api.post('/purchases', payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally { setBusy(false); }
  };

  const confirmReceive = async () => {
    setBusy(true);
    try {
      await api.patch(`/purchases/${receiving._id}/receive`);
      setReceiving(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not receive order');
      setReceiving(null);
    } finally { setBusy(false); }
  };

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await api.patch(`/purchases/${cancelling._id}/cancel`);
      setCancelling(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel order');
      setCancelling(null);
    } finally { setBusy(false); }
  };

  const downloadPdf = (p) => downloadBlob(api.get(`/purchases/${p._id}/pdf`, { responseType: 'blob' }), `${p.poNumber}.pdf`);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/purchases/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete purchase order');
      setDeleting(null);
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      title="Purchase Orders"
      subtitle="Restock from your suppliers and receive inventory."
      actions={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Purchase Order</button>}
    >
      <div style={{ marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search PO number or supplier…" />
      </div>

      {error && !showForm && !deleting && <div style={{ color: 'var(--text-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><ClipboardList size={28} style={{ opacity: 0.4, marginBottom: 10 }} /><div>No purchase orders found.</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th className="hide-mobile">Items</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const st = statusStyle[p.status];
                return (
                  <tr key={p._id} onClick={() => setViewing(p)} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ fontWeight: 600 }}>{p.poNumber}</td>
                    <td>{p.supplierName}</td>
                    <td className="hide-mobile">{p.items.length}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{formatMoney(p.total, symbol)}</td>
                    <td><span className="badge" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{p.status}</span></td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm" onClick={() => setViewing(p)} style={{ marginRight: 6 }} title="View details"><Eye size={13} /></button>
                      <button className="btn btn-sm" onClick={() => downloadPdf(p)} style={{ marginRight: 6 }} title="Download PDF"><Download size={13} /></button>
                      {p.status === 'pending' && (
                        <>
                          <button className="btn btn-sm" onClick={() => setReceiving(p)} style={{ marginRight: 6 }} title="Receive"><PackageCheck size={13} /></button>
                          <button className="btn btn-sm" onClick={() => openEdit(p)} style={{ marginRight: 6 }} title="Edit"><Pencil size={13} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => setCancelling(p)} style={{ marginRight: 6 }} title="Cancel"><Ban size={13} /></button>
                        </>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleting(p)} title="Delete"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? `Edit ${editing.poNumber}` : 'New Purchase Order'} onClose={() => setShowForm(false)} width={620}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Supplier</label>
              <select value={supplier} onChange={(e) => setSupplier(e.target.value)} required>
                <option value="">Select a supplier</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label>Items</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines.map((line, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 30px', gap: 8, alignItems: 'center' }}>
                    <select value={line.product} onChange={(e) => updateLine(i, 'product', e.target.value)} required>
                      <option value="">Select product</option>
                      {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} placeholder="Qty" />
                    <input type="number" min="0" step="0.01" value={line.cost} onChange={(e) => updateLine(i, 'cost', e.target.value)} placeholder="Cost" />
                    <button type="button" onClick={() => removeLine(i)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}><X size={16} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-sm" onClick={addLine} style={{ marginTop: 8 }}><Plus size={13} /> Add line</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label>Shipping / handling</label>
                <input type="number" min="0" step="0.01" value={shipping} onChange={(e) => setShipping(e.target.value)} />
              </div>
              <div>
                <label>Order total</label>
                <input value={formatMoney(total, symbol)} readOnly style={{ fontWeight: 700, color: 'var(--accent-cyan)' }} />
              </div>
            </div>

            {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save Changes' : 'Create Purchase Order'}</button>
            </div>
          </form>
        </Modal>
      )}

      {receiving && (
        <ConfirmModal
          title="Receive this order?"
          message={`Marking "${receiving.poNumber}" as received will add its items to your inventory.`}
          confirmLabel="Receive Stock"
          danger={false}
          busy={busy}
          onConfirm={confirmReceive}
          onClose={() => setReceiving(null)}
        />
      )}
      {cancelling && (
        <ConfirmModal
          title="Cancel this order?"
          message={`This will cancel "${cancelling.poNumber}". No stock will be added.`}
          confirmLabel="Cancel Order"
          busy={busy}
          onConfirm={confirmCancel}
          onClose={() => setCancelling(null)}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this purchase order?"
          message={
            deleting.status === 'received'
              ? `"${deleting.poNumber}" was already received — deleting it will also remove the stock it added to your inventory. This cannot be undone.`
              : `This will permanently delete "${deleting.poNumber}". This cannot be undone.`
          }
          confirmLabel="Delete"
          busy={busy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
      {viewing && (
        <Modal title={viewing.poNumber} onClose={() => setViewing(null)} width={680}>
          <div className="po-detail">
            <div className="po-detail-top">
              <div className="po-detail-top-info">
                <div className="po-detail-label">Supplier</div>
                <div className="po-detail-supplier">{viewing.supplierName}</div>
              </div>
              <div className="po-detail-top-meta">
                <span
                  className="badge"
                  style={{
                    color: statusStyle[viewing.status].color,
                    background: statusStyle[viewing.status].bg,
                    border: `1px solid ${statusStyle[viewing.status].border}`,
                    fontSize: 12,
                  }}
                >
                  {viewing.status}
                </span>
              </div>
            </div>

            <div className="po-detail-dates">
              <div className="po-detail-date-item">
                <span className="po-detail-label">Created</span>
                <span>{new Date(viewing.createdAt).toLocaleString()}</span>
              </div>
              {viewing.receivedAt && (
                <div className="po-detail-date-item">
                  <span className="po-detail-label">Received</span>
                  <span>{new Date(viewing.receivedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="table-wrap po-detail-table">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="hide-mobile">SKU</th>
                    <th style={{ textAlign: 'right' }}>Cost</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.name}</td>
                      <td className="hide-mobile mono" style={{ color: 'var(--text-secondary)' }}>{it.sku || '—'}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatMoney(it.cost, symbol)}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{it.quantity}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatMoney(it.total, symbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="po-detail-summary">
              <div className="po-detail-summary-row"><span>Subtotal</span><span className="mono">{formatMoney(viewing.subtotal, symbol)}</span></div>
              {viewing.shipping > 0 && <div className="po-detail-summary-row"><span>Shipping</span><span className="mono">{formatMoney(viewing.shipping, symbol)}</span></div>}
              <div className="po-detail-summary-row po-detail-summary-total"><span>Total</span><span className="mono">{formatMoney(viewing.total, symbol)}</span></div>
            </div>

            {viewing.notes && (
              <div className="po-detail-notes"><strong>Notes:</strong> {viewing.notes}</div>
            )}

            <div className="po-detail-actions">
              <button className="btn btn-primary btn-sm" onClick={() => downloadPdf(viewing)}><Download size={13} /> Download PDF</button>
              {viewing.status === 'pending' && (
                <>
                  <button className="btn btn-sm" onClick={() => { setReceiving(viewing); setViewing(null); }}><PackageCheck size={13} /> Receive</button>
                  <button className="btn btn-sm" onClick={() => { const p = viewing; setViewing(null); openEdit(p); }}><Pencil size={13} /> Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { setCancelling(viewing); setViewing(null); }}><Ban size={13} /> Cancel</button>
                </>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => { setDeleting(viewing); setViewing(null); }}><Trash2 size={13} /> Delete</button>
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>

          <style>{`
            .po-detail { display: flex; flex-direction: column; gap: 16px; }
            .po-detail-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
            .po-detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 4px; display: block; }
            .po-detail-supplier { font-size: 16px; font-weight: 700; color: var(--text-primary); }
            .po-detail-dates { display: flex; gap: 24px; flex-wrap: wrap; padding: 12px 14px; background: var(--bg-inset); border-radius: 10px; }
            .po-detail-date-item { display: flex; flex-direction: column; gap: 3px; font-size: 12.5px; color: var(--text-primary); }
            .po-detail-table table { min-width: 460px; }
            .po-detail-summary { display: flex; flex-direction: column; gap: 7px; max-width: 260px; margin-left: auto; padding-top: 6px; }
            .po-detail-summary-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); }
            .po-detail-summary-total { font-size: 15.5px; font-weight: 700; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--border-hairline-soft); }
            .po-detail-notes { font-size: 13px; color: var(--text-secondary); background: var(--bg-inset); border-radius: 8px; padding: 10px 12px; }
            .po-detail-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-top: 4px; border-top: 1px solid var(--border-hairline-soft); }

            @media (max-width: 640px) {
              .po-detail-top { flex-direction: column; gap: 8px; }
              .po-detail-dates { gap: 14px; padding: 10px 12px; }
              .po-detail-summary { max-width: none; margin-left: 0; }
              .po-detail-actions { flex-direction: column; align-items: stretch; }
              .po-detail-actions button { width: 100%; justify-content: center; }
              .po-detail-actions button:last-child { margin-left: 0 !important; }
            }
          `}</style>
        </Modal>
      )}
    </PageShell>
  );
}
