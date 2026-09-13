import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/currency';

const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [symbol, setSymbol] = useState('$');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings').then((res) => setSymbol(res.data.currencySymbol || '$'));
  }, []);

  const load = () => {
    setLoading(true);
    api.get('/customers', { params: { search: debouncedSearch } }).then((res) => setItems(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, [debouncedSearch]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setError(''); setShowForm(true); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) await api.put(`/customers/${editing._id}`, form);
      else await api.post('/customers', form);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/customers/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete customer');
      setDeleting(null);
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      title="Customers"
      subtitle="Keep track of who's buying from your store."
      actions={canManage && <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Customer</button>}
    >
      <div style={{ marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, email…" />
      </div>

      {error && !showForm && <div style={{ color: 'var(--text-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><Users size={28} style={{ opacity: 0.4, marginBottom: 10 }} /><div>No customers found.</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-mobile">Phone</th>
                <th className="hide-mobile">Email</th>
                <th style={{ textAlign: 'right' }}>Orders</th>
                <th style={{ textAlign: 'right' }}>Total Spent</th>
                {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="hide-mobile mono" style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                  <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                  <td style={{ textAlign: 'right' }} className="mono">{c.totalPurchases}</td>
                  <td style={{ textAlign: 'right' }} className="mono">{formatMoney(c.totalSpent, symbol)}</td>
                  {canManage && (
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm" onClick={() => openEdit(c)} style={{ marginRight: 6 }}><Pencil size={13} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleting(c)}><Trash2 size={13} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Customer' : 'New Customer'} onClose={() => setShowForm(false)} width={460}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal title="Delete customer?" message={`This will permanently delete "${deleting.name}".`} confirmLabel="Delete" busy={busy} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
      )}
    </PageShell>
  );
}
