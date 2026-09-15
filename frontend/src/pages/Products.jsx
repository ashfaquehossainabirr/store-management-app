import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, ChevronLeft, ChevronRight, SlidersHorizontal, FileDown, History } from 'lucide-react';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/currency';
import { exportToCSV } from '../utils/csv';

const emptyForm = { name: '', sku: '', barcode: '', category: '', unit: 'pcs', costPrice: '', sellPrice: '', stock: '', reorderLevel: 5, description: '' };

export default function Products() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [symbol, setSymbol] = useState('$');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
    api.get('/settings').then((res) => setSymbol(res.data.currencySymbol || '$'));
  }, []);

  const load = () => {
    setLoading(true);
    api
      .get('/products', { params: { search: debouncedSearch, category: categoryFilter, lowStock: lowStockOnly || undefined, page, limit: 12 } })
      .then((res) => {
        setItems(res.data.items);
        setPages(res.data.pages || 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [debouncedSearch, categoryFilter, lowStockOnly, page]);
  useEffect(() => setPage(1), [debouncedSearch, categoryFilter, lowStockOnly]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku, barcode: p.barcode || '', category: p.category?._id || '',
      unit: p.unit, costPrice: p.costPrice, sellPrice: p.sellPrice, stock: p.stock, reorderLevel: p.reorderLevel, description: p.description || '',
    });
    setError('');
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        category: form.category || null,
        costPrice: Number(form.costPrice) || 0,
        sellPrice: Number(form.sellPrice) || 0,
        stock: Number(form.stock) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
      };
      if (editing) {
        await api.put(`/products/${editing._id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/products/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete product');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const stockBadge = (p) => {
    if (p.stock <= 0) return { label: 'Out of stock', color: 'var(--status-cancelled)', bg: 'var(--chip-overdue-bg)', border: 'var(--chip-overdue-border)' };
    if (p.stock <= p.reorderLevel) return { label: 'Low stock', color: 'var(--status-hold)', bg: 'var(--chip-urgent-bg)', border: 'var(--chip-urgent-border)' };
    return { label: 'In stock', color: 'var(--status-delivered)', bg: 'color-mix(in srgb, var(--status-delivered) 14%, transparent)', border: 'color-mix(in srgb, var(--status-delivered) 40%, transparent)' };
  };

  const openAdjust = (p) => {
    setAdjusting(p);
    setAdjustQty('');
    setAdjustReason('');
    setAdjustError('');
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    const qty = Number(adjustQty);
    if (!qty) {
      setAdjustError('Enter a non-zero quantity');
      return;
    }
    setBusy(true);
    setAdjustError('');
    try {
      await api.patch(`/products/${adjusting._id}/stock`, { adjustment: qty, reason: adjustReason });
      setAdjusting(null);
      load();
    } catch (err) {
      setAdjustError(err.response?.data?.message || 'Could not adjust stock');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    const res = await api.get('/products', { params: { search: debouncedSearch, category: categoryFilter, lowStock: lowStockOnly || undefined, export: 'true' } });
    exportToCSV(
      'products.csv',
      res.data.items.map((p) => ({
        Name: p.name,
        SKU: p.sku,
        Barcode: p.barcode || '',
        Category: p.category?.name || '',
        Unit: p.unit,
        'Cost Price': p.costPrice,
        'Sell Price': p.sellPrice,
        Stock: p.stock,
        'Reorder Level': p.reorderLevel,
      }))
    );
  };

  return (
    <PageShell
      title="Products"
      subtitle="Manage your product catalog and stock levels."
      actions={
        <>
          <Link to="/products/stock-history" className="btn"><History size={15} /> Stock History</Link>
          <button className="btn" onClick={exportCsv}><FileDown size={15} /> Export CSV</button>
          {canManage && <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Product</button>}
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, SKU, barcode…" />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, textTransform: 'none', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} style={{ width: 'auto' }} />
          Low stock only
        </label>
      </div>

      {error && !showForm && <div style={{ color: 'var(--text-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card">
          <Package size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
          <div>No products found.</div>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="hide-mobile">Category</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th>Status</th>
                  {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const badge = stockBadge(p);
                  return (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>{p.sku}</td>
                      <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{p.category?.name || '—'}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatMoney(p.sellPrice, symbol)}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{p.stock} {p.unit}</td>
                      <td><span className="badge" style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>{badge.label}</span></td>
                      {canManage && (
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm" onClick={() => openAdjust(p)} title="Adjust stock" style={{ marginRight: 6 }}><SlidersHorizontal size={13} /></button>
                          <button className="btn btn-sm" onClick={() => openEdit(p)} style={{ marginRight: 6 }}><Pencil size={13} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleting(p)}><Trash2 size={13} /></button>
                        </td>
                      )}
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

      {showForm && (
        <Modal title={editing ? 'Edit Product' : 'New Product'} onClose={() => setShowForm(false)} width={560}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid-2">
              <div>
                <label>Product name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div>
                <label>SKU</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
              </div>
            </div>
            <div className="form-grid-2">
              <div>
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label>Unit</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs, kg, box…" />
              </div>
            </div>
            <div className="form-grid-3">
              <div>
                <label>Cost price</label>
                <input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
              </div>
              <div>
                <label>Sell price</label>
                <input type="number" step="0.01" min="0" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} required />
              </div>
              <div>
                <label>Barcode</label>
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
            </div>
            <div className="form-grid-2">
              <div>
                <label>Stock quantity</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
              </div>
              <div>
                <label>Reorder level</label>
                <input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
              </div>
            </div>
            <div>
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
          <style>{`
            .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
            .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
            @media (max-width: 480px) { .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; } }
          `}</style>
        </Modal>
      )}

      {adjusting && (
        <Modal title={`Adjust Stock — ${adjusting.name}`} onClose={() => setAdjusting(null)} width={380}>
          <form onSubmit={submitAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Current stock: <strong style={{ color: 'var(--text-primary)' }}>{adjusting.stock} {adjusting.unit}</strong></div>
            <div>
              <label>Quantity change</label>
              <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="e.g. 10 or -5" required autoFocus />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Positive to add stock, negative to remove (damage, loss, recount…).</div>
            </div>
            <div>
              <label>Reason</label>
              <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Damaged in storage, stock recount…" />
            </div>
            {adjustError && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{adjustError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setAdjusting(null)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Adjustment'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete product?"
          message={`This will permanently delete "${deleting.name}".`}
          confirmLabel="Delete"
          busy={busy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </PageShell>
  );
}
