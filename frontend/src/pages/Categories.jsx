import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Categories() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => {
    setLoading(true);
    api.get('/categories').then((res) => setCategories(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || '' });
    setError('');
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/categories/${editing._id}`, form);
      } else {
        await api.post('/categories', form);
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
      await api.delete(`/categories/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete category');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Categories"
      subtitle="Organize your products into categories."
      actions={canManage && <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Category</button>}
    >
      <div style={{ marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" />
      </div>

      {error && !showForm && <div style={{ color: 'var(--text-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <Tags size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
          <div>No categories found.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.description || '—'}</td>
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
        <Modal title={editing ? 'Edit Category' : 'New Category'} onClose={() => setShowForm(false)} width={420}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div>
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
        <ConfirmModal
          title="Delete category?"
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
