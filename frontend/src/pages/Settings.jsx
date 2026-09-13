import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import api from '../api/axios';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'BDT', symbol: 'Tk' },
  { code: 'INR', symbol: '₹' },
  { code: 'PKR', symbol: '₨' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'AUD', symbol: 'A$' },
];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings').then((res) => setForm(res.data)).finally(() => setLoading(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const res = await api.put('/settings', form);
      setForm(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save settings');
    } finally { setBusy(false); }
  };

  const setCurrency = (code) => {
    const c = CURRENCIES.find((x) => x.code === code);
    setForm({ ...form, currency: code, currencySymbol: c?.symbol || form.currencySymbol });
  };

  if (loading || !form) {
    return (
      <PageShell title="Store Settings"><div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div></PageShell>
    );
  }

  return (
    <PageShell title="Store Settings" subtitle="Configure your store profile, currency, and invoicing.">
      <form onSubmit={submit} className="card settings-form">
        <div className="settings-section">
          <h3>Store Profile</h3>
          <div className="form-grid-2">
            <div>
              <label>Store name</label>
              <input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} required />
            </div>
            <div>
              <label>Store type</label>
              <input value={form.storeType} onChange={(e) => setForm({ ...form, storeType: e.target.value })} placeholder="Grocery, Retail, Pharmacy…" />
            </div>
          </div>
          <div>
            <label>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
        </div>

        <div className="settings-section">
          <h3>Billing &amp; Invoicing</h3>
          <div className="form-grid-3">
            <div>
              <label>Currency</label>
              <select value={form.currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
            <div>
              <label>Currency symbol</label>
              <input value={form.currencySymbol} onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })} />
            </div>
            <div>
              <label>Default tax rate (%)</label>
              <input type="number" min="0" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
            </div>
          </div>
          <div className="form-grid-2">
            <div>
              <label>Invoice number prefix</label>
              <input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
            </div>
            <div>
              <label>Low stock threshold (default)</label>
              <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        {error && <div style={{ color: 'var(--text-error)', fontSize: 13 }}>{error}</div>}
        {saved && <div style={{ color: 'var(--status-delivered)', fontSize: 13 }}>Settings saved.</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={busy}><Save size={15} /> {busy ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </form>

      <style>{`
        .settings-form { padding: 26px; max-width: 720px; display: flex; flex-direction: column; gap: 26px; }
        .settings-section { display: flex; flex-direction: column; gap: 14px; }
        .settings-section h3 { font-family: var(--font-display); font-size: 15px; margin: 0 0 2px; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 560px) { .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; } }
      `}</style>
    </PageShell>
  );
}
