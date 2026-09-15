import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Wallet } from 'lucide-react';
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

  const [ledgerFor, setLedgerFor] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');

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

  const openLedger = (c) => {
    setLedgerFor(c);
    setPayAmount('');
    setPayNote('');
    setPayError('');
    setLedgerLoading(true);
    api.get(`/customers/${c._id}/ledger`).then((res) => setLedger(res.data)).finally(() => setLedgerLoading(false));
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setPayBusy(true);
    setPayError('');
    try {
      await api.post(`/customers/${ledgerFor._id}/payments`, { amount: Number(payAmount), note: payNote });
      const res = await api.get(`/customers/${ledgerFor._id}/ledger`);
      setLedger(res.data);
      setPayAmount('');
      setPayNote('');
      load();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Could not record payment');
    } finally { setPayBusy(false); }
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
                      <button className="btn btn-sm" onClick={() => openLedger(c)} title="Balance & payments" style={{ marginRight: 6 }}><Wallet size={13} /></button>
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
            <div className="form-grid-2">
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

      {ledgerFor && (
        <Modal title={`${ledgerFor.name} — Balance`} onClose={() => setLedgerFor(null)} width={460}>
          {ledgerLoading || !ledger ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Spinner size={24} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-inset)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total due</span>
                <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: ledger.totalDue > 0 ? 'var(--text-error)' : 'var(--status-delivered)' }}>{formatMoney(ledger.totalDue, symbol)}</span>
              </div>

              {ledger.dueSales.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8 }}>Outstanding invoices</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ledger.dueSales.map((s) => (
                      <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px 10px', fontSize: 12.5 }}>
                        <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{s.invoiceNumber}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                        <span className="mono" style={{ fontWeight: 700, marginLeft: 'auto' }}>{formatMoney(s.dueAmount, symbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canManage && ledger.totalDue > 0 && (
                <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border-hairline-soft)' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: 8 }}>Record payment</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input type="number" min="0" step="0.01" max={ledger.totalDue} placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required style={{ flex: '1 1 120px' }} />
                    <input placeholder="Note (optional)" value={payNote} onChange={(e) => setPayNote(e.target.value)} style={{ flex: '1 1 140px' }} />
                  </div>
                  {payError && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{payError}</div>}
                  <button type="submit" className="btn btn-primary" disabled={payBusy} style={{ justifyContent: 'center' }}>{payBusy ? 'Saving…' : 'Record Payment'}</button>
                </form>
              )}

              {ledger.payments.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8 }}>Payment history</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ledger.payments.map((p) => (
                      <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        <span>{new Date(p.createdAt).toLocaleDateString()}{p.note ? ` — ${p.note}` : ''}</span>
                        <span className="mono" style={{ color: 'var(--status-delivered)', fontWeight: 700 }}>{formatMoney(p.amount, symbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      <style>{`
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 480px) { .form-grid-2 { grid-template-columns: 1fr; } }
      `}</style>
    </PageShell>
  );
}
