import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download, ArrowLeft, Ban, DollarSign, Trash2, RotateCcw, Printer } from 'lucide-react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';
import { downloadBlob } from '../utils/download';

const statusStyle = {
  paid: { color: 'var(--status-delivered)', bg: 'color-mix(in srgb, var(--status-delivered) 14%, transparent)', border: 'color-mix(in srgb, var(--status-delivered) 40%, transparent)' },
  partial: { color: 'var(--status-hold)', bg: 'var(--chip-urgent-bg)', border: 'var(--chip-urgent-border)' },
  due: { color: 'var(--status-cancelled)', bg: 'var(--chip-overdue-bg)', border: 'var(--chip-overdue-border)' },
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('$');
  const [store, setStore] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundQtys, setRefundQtys] = useState({});
  const [refundReason, setRefundReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/sales/${id}`).then((res) => { setSale(res.data); setPayAmount(res.data.amountPaid); }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/settings').then((res) => { setSymbol(res.data.currencySymbol || '$'); setStore(res.data); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const downloadPdf = () => downloadBlob(api.get(`/sales/${id}/pdf`, { responseType: 'blob' }), `${sale.invoiceNumber}.pdf`);

  const printReceipt = () => window.print();

  const submitPayment = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.patch(`/sales/${id}/payment`, { amountPaid: Number(payAmount) });
      setSale(res.data);
      setShowPayModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update payment');
    } finally { setBusy(false); }
  };

  const voidInvoice = async () => {
    setBusy(true);
    try {
      const res = await api.patch(`/sales/${id}/void`);
      setSale(res.data);
      setShowVoidConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not void invoice');
      setShowVoidConfirm(false);
    } finally { setBusy(false); }
  };

  const deleteInvoice = async () => {
    setBusy(true);
    try {
      await api.delete(`/sales/${id}`);
      navigate('/invoices');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete invoice');
      setShowDeleteConfirm(false);
      setBusy(false);
    }
  };

  const openRefundModal = () => {
    setRefundQtys({});
    setRefundReason('');
    setError('');
    setShowRefundModal(true);
  };

  const submitRefund = async (e) => {
    e.preventDefault();
    const lines = Object.entries(refundQtys)
      .map(([index, quantity]) => ({ index: Number(index), quantity: Number(quantity) }))
      .filter((l) => l.quantity > 0);
    if (lines.length === 0) {
      setError('Enter a quantity to refund for at least one item');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/sales/${id}/refund`, { lines, reason: refundReason });
      setSale(res.data);
      setShowRefundModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not process refund');
    } finally { setBusy(false); }
  };

  if (loading || !sale) {
    return (
      <PageShell title="Invoice">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      </PageShell>
    );
  }

  const st = statusStyle[sale.paymentStatus] || statusStyle.paid;

  return (
    <PageShell
      title={sale.invoiceNumber}
      subtitle={new Date(sale.createdAt).toLocaleString()}
      actions={
        <>
          <Link to="/invoices" className="btn"><ArrowLeft size={15} /> Back</Link>
          <button className="btn" onClick={printReceipt}><Printer size={15} /> Print Receipt</button>
          <button className="btn btn-primary" onClick={downloadPdf}><Download size={15} /> Download PDF</button>
        </>
      }
    >
      <div className="invoice-layout">
        <div className="card invoice-main">
          <div className="invoice-top">
            <div>
              <div className="invoice-label">Billed to</div>
              <div className="invoice-customer">{sale.customerName}</div>
              {sale.customerPhone && <div className="mono" style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{sale.customerPhone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12 }}>
                {sale.paymentStatus}{sale.status === 'cancelled' ? ' · void' : ''}{sale.status === 'refunded' ? ' · refunded' : ''}
              </span>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginTop: 6, textTransform: 'capitalize' }}>{sale.paymentMethod.replace('-', ' ')}</div>
            </div>
          </div>

          <div className="table-wrap" style={{ marginTop: 20, border: 'none' }}>
            <table>
              <thead>
                <tr><th>Item</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr>
              </thead>
              <tbody>
                {sale.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.name}<div className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{it.sku}</div></td>
                    <td style={{ textAlign: 'right' }} className="mono">{formatMoney(it.price, symbol)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      {it.quantity}
                      {it.refundedQuantity > 0 && (
                        <div style={{ fontSize: 10.5, color: 'var(--status-hold)' }}>{it.refundedQuantity} refunded</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">{formatMoney(it.total, symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice-summary">
            <div className="invoice-summary-row"><span>Subtotal</span><span className="mono">{formatMoney(sale.subtotal, symbol)}</span></div>
            {sale.discount > 0 && <div className="invoice-summary-row"><span>Discount</span><span className="mono">-{formatMoney(sale.discount, symbol)}</span></div>}
            {sale.tax > 0 && <div className="invoice-summary-row"><span>Tax ({sale.taxRate}%)</span><span className="mono">{formatMoney(sale.tax, symbol)}</span></div>}
            <div className="invoice-summary-row invoice-summary-total"><span>Total</span><span className="mono">{formatMoney(sale.total, symbol)}</span></div>
            <div className="invoice-summary-row"><span>Amount paid</span><span className="mono">{formatMoney(sale.amountPaid, symbol)}</span></div>
            {sale.refundedAmount > 0 && <div className="invoice-summary-row" style={{ color: 'var(--status-hold)' }}><span>Refunded</span><span className="mono">-{formatMoney(sale.refundedAmount, symbol)}</span></div>}
            {sale.dueAmount > 0 && <div className="invoice-summary-row" style={{ color: 'var(--text-error)', fontWeight: 700 }}><span>Balance due</span><span className="mono">{formatMoney(sale.dueAmount, symbol)}</span></div>}
          </div>

          {sale.notes && <div style={{ marginTop: 18, fontSize: 13, color: 'var(--text-secondary)' }}><strong>Notes: </strong>{sale.notes}</div>}

          {sale.refunds?.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-hairline-soft)' }}>
              <div className="invoice-label" style={{ marginBottom: 10 }}>Refund history</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sale.refunds.map((r, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span>
                      {r.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                      {r.reason && <span style={{ color: 'var(--text-muted)' }}> — {r.reason}</span>}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(r.createdAt).toLocaleString()} · {r.refundedByName}
                      </div>
                    </span>
                    <span className="mono" style={{ color: 'var(--status-hold)', fontWeight: 700, whiteSpace: 'nowrap' }}>-{formatMoney(r.amount, symbol)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card invoice-side">
          <div className="invoice-side-item"><span>Cashier</span><span>{sale.cashierName}</span></div>
          <div className="invoice-side-item"><span>Items</span><span>{sale.items.length}</span></div>
          <div className="invoice-side-item"><span>Created</span><span>{new Date(sale.createdAt).toLocaleDateString()}</span></div>

          {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5, marginTop: 10 }}>{error}</div>}

          {canManage && sale.status !== 'cancelled' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {sale.dueAmount > 0 && (
                <button className="btn btn-primary" onClick={() => setShowPayModal(true)}><DollarSign size={14} /> Record Payment</button>
              )}
              {sale.status !== 'refunded' && (
                <button className="btn" onClick={openRefundModal}><RotateCcw size={14} /> Refund Items</button>
              )}
              <button className="btn btn-danger" onClick={() => setShowVoidConfirm(true)}><Ban size={14} /> Void Invoice</button>
            </div>
          )}

          {canManage && (
            <div style={{ marginTop: sale.status !== 'cancelled' ? 8 : 16 }}>
              <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} /> Delete Invoice
              </button>
            </div>
          )}
        </div>
      </div>

      <div id="receipt-print-area">
        <div className="receipt-store-name">{store?.storeName || 'Store'}</div>
        {store?.address && <div className="receipt-line">{store.address}</div>}
        {store?.phone && <div className="receipt-line">{store.phone}</div>}
        <div className="receipt-divider" />
        <div className="receipt-line">{sale.invoiceNumber}</div>
        <div className="receipt-line">{new Date(sale.createdAt).toLocaleString()}</div>
        <div className="receipt-line">Cashier: {sale.cashierName}</div>
        {sale.customerName && sale.customerName !== 'Walk-in Customer' && <div className="receipt-line">Customer: {sale.customerName}</div>}
        <div className="receipt-divider" />
        {sale.items.map((it, i) => (
          <div className="receipt-item" key={i}>
            <div className="receipt-item-name">{it.name} × {it.quantity}</div>
            <div className="receipt-item-total mono">{formatMoney(it.total, symbol)}</div>
          </div>
        ))}
        <div className="receipt-divider" />
        <div className="receipt-item"><span>Subtotal</span><span className="mono">{formatMoney(sale.subtotal, symbol)}</span></div>
        {sale.discount > 0 && <div className="receipt-item"><span>Discount</span><span className="mono">-{formatMoney(sale.discount, symbol)}</span></div>}
        {sale.tax > 0 && <div className="receipt-item"><span>Tax</span><span className="mono">{formatMoney(sale.tax, symbol)}</span></div>}
        <div className="receipt-item receipt-total"><span>Total</span><span className="mono">{formatMoney(sale.total, symbol)}</span></div>
        <div className="receipt-item"><span>Paid</span><span className="mono">{formatMoney(sale.amountPaid, symbol)}</span></div>
        {sale.dueAmount > 0 && <div className="receipt-item"><span>Due</span><span className="mono">{formatMoney(sale.dueAmount, symbol)}</span></div>}
        <div className="receipt-divider" />
        <div className="receipt-thanks">Thank you for your purchase!</div>
      </div>

      {showPayModal && (
        <Modal title="Record Payment" onClose={() => setShowPayModal(false)} width={360}>
          <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>Amount paid so far</label>
              <input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required autoFocus />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Total due: {formatMoney(sale.total, symbol)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowPayModal(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showRefundModal && (
        <Modal title="Refund Items" onClose={() => setShowRefundModal(false)} width={460}>
          <form onSubmit={submitRefund} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sale.items.map((it, i) => {
                const available = it.quantity - (it.refundedQuantity || 0);
                if (available <= 0) return null;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{available} available to refund · {formatMoney(it.price, symbol)} each</div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={available}
                      style={{ width: 70 }}
                      value={refundQtys[i] || ''}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(available, Number(e.target.value) || 0));
                        setRefundQtys((prev) => ({ ...prev, [i]: v }));
                      }}
                      placeholder="0"
                    />
                  </div>
                );
              })}
            </div>
            <div>
              <label>Reason (optional)</label>
              <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Damaged, customer changed mind…" />
            </div>
            {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowRefundModal(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Processing…' : 'Process Refund'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showVoidConfirm && (
        <ConfirmModal
          title="Void this invoice?"
          message="This restocks all sold items and marks the invoice as cancelled. This cannot be undone."
          confirmLabel="Void Invoice"
          busy={busy}
          onConfirm={voidInvoice}
          onClose={() => setShowVoidConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete this invoice?"
          message={
            sale.status === 'cancelled'
              ? `This will permanently delete "${sale.invoiceNumber}". This cannot be undone.`
              : `This will permanently delete "${sale.invoiceNumber}" and restock its items back into inventory. This cannot be undone.`
          }
          confirmLabel="Delete Invoice"
          busy={busy}
          onConfirm={deleteInvoice}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      <style>{`
        .invoice-layout { display: grid; grid-template-columns: 1fr 260px; gap: 20px; align-items: start; }
        .invoice-main { padding: 24px; }
        .invoice-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
        .invoice-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 4px; }
        .invoice-customer { font-size: 16px; font-weight: 700; }
        .invoice-summary { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-hairline-soft); display: flex; flex-direction: column; gap: 8px; max-width: 320px; margin-left: auto; }
        .invoice-summary-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); }
        .invoice-summary-total { font-size: 16px; font-weight: 700; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--border-hairline-soft); }
        .invoice-side { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
        .invoice-side-item { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-secondary); }
        .invoice-side-item span:last-child { color: var(--text-primary); font-weight: 600; }
        @media (max-width: 900px) { .invoice-layout { grid-template-columns: 1fr; } .invoice-summary { max-width: none; } }

        #receipt-print-area { display: none; }

        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            display: block; position: absolute; top: 0; left: 0; width: 280px;
            font-family: var(--font-mono), monospace; font-size: 11px; color: #000; padding: 10px;
          }
          .receipt-store-name { font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 4px; }
          .receipt-line { text-align: center; font-size: 10.5px; }
          .receipt-divider { border-top: 1px dashed #000; margin: 8px 0; }
          .receipt-item { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; padding: 2px 0; }
          .receipt-item-name { flex: 1; }
          .receipt-total { font-weight: 700; font-size: 12px; border-top: 1px dashed #000; margin-top: 4px; padding-top: 6px; }
          .receipt-thanks { text-align: center; margin-top: 10px; font-size: 11px; }
        }
      `}</style>
    </PageShell>
  );
}
