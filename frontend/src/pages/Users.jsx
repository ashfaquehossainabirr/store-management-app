import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserCog } from 'lucide-react';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';

const emptyForm = { name: '', email: '', password: '', role: 'cashier', phone: '' };

const roleColor = { admin: 'var(--accent-cyan)', manager: 'var(--status-hold)', cashier: 'var(--text-muted)' };

export default function Users() {
  const { user: me } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/users', { params: { search: debouncedSearch } }).then((res) => setItems(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, [debouncedSearch]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' }); setError(''); setShowForm(true); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        const payload = { name: form.name, role: form.role, phone: form.phone };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing._id}`, payload);
      } else {
        await api.post('/users', form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setBusy(false); }
  };

  const toggleActive = async (u) => {
    if (u.isActive) {
      setDeactivating(u);
      return;
    }
    try {
      await api.put(`/users/${u._id}`, { isActive: true });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update user');
    }
  };

  const confirmDeactivate = async () => {
    setBusy(true);
    try {
      await api.put(`/users/${deactivating._id}`, { isActive: false });
      setDeactivating(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update user');
      setDeactivating(null);
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete user');
      setDeleting(null);
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      title="Team & Access"
      subtitle="Manage who can access your store dashboard."
      actions={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New User</button>}
    >
      <div style={{ marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone…" />
      </div>

      {error && !showForm && <div style={{ color: 'var(--text-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><UserCog size={28} style={{ opacity: 0.4, marginBottom: 10 }} /><div>No users found.</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-mobile">Email</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name} {u.isMainAdmin && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(main admin)</span>}</td>
                  <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td><span className="badge" style={{ color: roleColor[u.role], background: 'var(--bg-inset)', border: '1px solid var(--border-hairline)' }}>{u.role}</span></td>
                  <td>
                    <button
                      className="btn btn-sm"
                      disabled={u.isMainAdmin}
                      onClick={() => toggleActive(u)}
                      style={{
                        color: u.isActive ? 'var(--status-delivered)' : 'var(--status-cancelled)',
                        borderColor: u.isActive ? 'color-mix(in srgb, var(--status-delivered) 40%, transparent)' : 'var(--chip-overdue-border)',
                      }}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm" onClick={() => openEdit(u)} style={{ marginRight: 6 }}><Pencil size={13} /></button>
                    <button className="btn btn-sm btn-danger" disabled={u.isMainAdmin || u._id === me?._id} onClick={() => setDeleting(u)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit User' : 'New User'} onClose={() => setShowForm(false)} width={420}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Full name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} />
            </div>
            <div>
              <label>{editing ? 'New password (optional)' : 'Password'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required={!editing} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={editing?.isMainAdmin}>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
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
        <ConfirmModal title="Delete user?" message={`This will permanently remove "${deleting.name}"'s access.`} confirmLabel="Delete" busy={busy} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
      )}

      {deactivating && (
        <ConfirmModal
          title="Deactivate user?"
          message={`"${deactivating.name}" will no longer be able to log in until reactivated.`}
          confirmLabel="Deactivate"
          busy={busy}
          onConfirm={confirmDeactivate}
          onClose={() => setDeactivating(null)}
        />
      )}
    </PageShell>
  );
}
