import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useDebounce } from '../hooks/useDebounce';

const emptyForm = { name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' };

export default function Suppliers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/suppliers', { params: { search: debouncedSearch } }).then((res) => setItems(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, [debouncedSearch]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, contactPerson: s.contactPerson || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setError(''); setShowForm(true); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) await api.put(`/suppliers/${editing._id}`, form);
      else await api.post('/suppliers', form);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/suppliers/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete supplier');
      setDeleting(null);
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      title="Suppliers"
      subtitle="Vendors you purchase stock from."
      actions={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Supplier</button>}
    >
      <div style={{ marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, contact, phone…" />
      </div>

      {error && !showForm && <div style={{ color: 'var(--text-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><Truck size={28} style={{ opacity: 0.4, marginBottom: 10 }} /><div>No suppliers found.</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-mobile">Contact person</th>
                <th className="hide-mobile">Phone</th>
                <th className="hide-mobile">Email</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{s.contactPerson || '—'}</td>
                  <td className="hide-mobile mono" style={{ color: 'var(--text-secondary)' }}>{s.phone || '—'}</td>
                  <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm" onClick={() => openEdit(s)} style={{ marginRight: 6 }}><Pencil size={13} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleting(s)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Supplier' : 'New Supplier'} onClose={() => setShowForm(false)} width={460}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Supplier name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div>
              <label>Contact person</label>
              <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
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
            {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal title="Delete supplier?" message={`This will permanently delete "${deleting.name}".`} confirmLabel="Delete" busy={busy} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
      )}
    </PageShell>
  );
}
