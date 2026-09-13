import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, UserPlus, PackageSearch } from 'lucide-react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import api from '../api/axios';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/currency';

const CARD_PALETTE = [
  '#4fd8a8', '#4a9eff', '#8b7cff', '#f0a83f', '#ef6461', '#3ecf8e', '#7ec8ff',
];

function hashColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_PALETTE[Math.abs(hash) % CARD_PALETTE.length];
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function POS() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cart, setCart] = useState([]);
  const [symbol, setSymbol] = useState('$');
  const [taxRate, setTaxRate] = useState(0);
  const [settings, setSettings] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('flat');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCartMobile, setShowCartMobile] = useState(false);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
    api.get('/customers').then((res) => setCustomers(res.data));
    api.get('/settings').then((res) => {
      setSymbol(res.data.currencySymbol || '$');
      setTaxRate(res.data.taxRate || 0);
      setSettings(res.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/products', { params: { search: debouncedSearch, category: categoryFilter, limit: 40 } })
      .then((res) => setProducts(res.data.items))
      .finally(() => setLoading(false));
  }, [debouncedSearch, categoryFilter]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((l) => (l.product === product._id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.stock <= 0) return prev;
      return [...prev, { product: product._id, name: product.name, sku: product.sku, price: product.sellPrice, quantity: 1, maxStock: product.stock }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((l) => (l.product === productId ? { ...l, quantity: Math.max(0, Math.min(l.maxStock, l.quantity + delta)) } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (productId) => setCart((prev) => prev.filter((l) => l.product !== productId));

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.price * l.quantity, 0), [cart]);
  const discountAmount = discountType === 'percent' ? (subtotal * Number(discount || 0)) / 100 : Number(discount || 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxable * Number(taxRate || 0)) / 100;
  const total = Math.max(0, taxable + taxAmount);

  const resetCheckoutFields = () => {
    setCart([]);
    setDiscount(0);
    setAmountPaid('');
    setCustomerId('');
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    setCheckoutBusy(true);
    setError('');
    try {
      const res = await api.post('/sales', {
        customer: customerId || undefined,
        items: cart.map((l) => ({ product: l.product, name: l.name, price: l.price, quantity: l.quantity })),
        discount: Number(discount) || 0,
        discountType,
        taxRate,
        amountPaid: amountPaid === '' ? total : Number(amountPaid),
        paymentMethod,
      });
      resetCheckoutFields();
      navigate(`/invoices/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const createCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', newCustomer);
      setCustomers((prev) => [res.data, ...prev]);
      setCustomerId(res.data._id);
      setShowNewCustomer(false);
      setNewCustomer({ name: '', phone: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add customer');
    }
  };

  const CartPanel = (
    <div className="pos-cart card">
      <div className="pos-cart-head">
        <h3><ShoppingCart size={16} /> Current Sale</h3>
        <button className="btn btn-sm hide-desktop" onClick={() => setShowCartMobile(false)} style={{ padding: 6 }}><X size={14} /></button>
      </div>

      <div className="pos-cart-items">
        {cart.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>Cart is empty. Tap a product to add it.</div>
        ) : (
          cart.map((l) => (
            <div className="cart-line" key={l.product}>
              <div className="cart-line-info">
                <div className="cart-line-name">{l.name}</div>
                <div className="cart-line-price mono">{formatMoney(l.price, symbol)} each</div>
              </div>
              <div className="cart-line-qty">
                <button onClick={() => updateQty(l.product, -1)}><Minus size={12} /></button>
                <span className="mono">{l.quantity}</span>
                <button onClick={() => updateQty(l.product, 1)} disabled={l.quantity >= l.maxStock}><Plus size={12} /></button>
              </div>
              <div className="cart-line-total mono">{formatMoney(l.price * l.quantity, symbol)}</div>
              <button className="cart-line-remove" onClick={() => removeLine(l.product)}><Trash2 size={13} /></button>
            </div>
          ))
        )}
      </div>

      <div className="pos-cart-footer">
        <div className="pos-field-row">
          <label style={{ margin: 0 }}>Customer</label>
          <button type="button" className="btn btn-sm" onClick={() => setShowNewCustomer(true)}><UserPlus size={13} /></button>
        </div>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Walk-in Customer</option>
          {customers.map((c) => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>)}
        </select>

        <div className="pos-field-row" style={{ marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Discount</label>
            <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div style={{ width: 90 }}>
            <label>Type</label>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="flat">Flat</option>
              <option value="percent">%</option>
            </select>
          </div>
        </div>

        <div className="pos-summary">
          <div className="pos-summary-row"><span>Subtotal</span><span className="mono">{formatMoney(subtotal, symbol)}</span></div>
          {discountAmount > 0 && <div className="pos-summary-row"><span>Discount</span><span className="mono">-{formatMoney(discountAmount, symbol)}</span></div>}
          {taxAmount > 0 && <div className="pos-summary-row"><span>Tax ({taxRate}%)</span><span className="mono">{formatMoney(taxAmount, symbol)}</span></div>}
          <div className="pos-summary-row pos-summary-total"><span>Total</span><span className="mono">{formatMoney(total, symbol)}</span></div>
        </div>

        <div className="pos-field-row" style={{ marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <label>Amount paid</label>
            <input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={total.toFixed(2)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Payment method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile-banking">Mobile Banking</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="due">Due / Credit</option>
            </select>
          </div>
        </div>

        {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5, marginTop: 8 }}>{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14, padding: '12px 16px', fontSize: 14.5 }} disabled={cart.length === 0 || checkoutBusy} onClick={checkout}>
          {checkoutBusy ? 'Processing…' : `Charge ${formatMoney(total, symbol)}`}
        </button>
      </div>
    </div>
  );

  return (
    <PageShell title="Point of Sale" subtitle="Ring up sales and generate invoices instantly.">
      <div className="pos-layout">
        <div className="pos-catalog">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or scan barcode…" style={{ paddingLeft: 32 }} autoFocus />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <button className="btn hide-desktop" onClick={() => setShowCartMobile(true)}>
              <ShoppingCart size={15} /> Cart ({cart.length})
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={26} /></div>
          ) : products.length === 0 ? (
            <div className="empty-state card">
              <PackageSearch size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
              <div>No products match your search.</div>
            </div>
          ) : (
            <div className="pos-grid">
              {products.map((p) => {
                const color = hashColor(p.name);
                const isOut = p.stock <= 0;
                const isLow = !isOut && p.stock <= p.reorderLevel;
                const inCart = cart.find((l) => l.product === p._id)?.quantity || 0;
                return (
                  <button key={p._id} className="pos-product-card" onClick={() => addToCart(p)} disabled={isOut}>
                    {inCart > 0 && <span className="pos-product-cart-badge">{inCart}</span>}
                    <div className="pos-product-top">
                      <div className="pos-product-icon" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)` }}>
                        {initials(p.name)}
                      </div>
                      <span className={`pos-product-stock-chip ${isOut ? 'out' : isLow ? 'low' : 'ok'}`}>
                        {isOut ? 'Out of stock' : isLow ? `${p.stock} left` : `${p.stock} in stock`}
                      </span>
                    </div>
                    <div className="pos-product-name">{p.name}</div>
                    <div className="pos-product-sku mono">{p.sku}</div>
                    <div className="pos-product-footer">
                      <span className="mono pos-product-price">{formatMoney(p.sellPrice, symbol)}</span>
                      <span className="pos-product-unit">/ {p.unit}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="pos-cart-desktop">{CartPanel}</div>
      </div>

      {showCartMobile && (
        <div className="pos-cart-overlay" onClick={() => setShowCartMobile(false)}>
          <div onClick={(e) => e.stopPropagation()} className="pos-cart-mobile-sheet">{CartPanel}</div>
        </div>
      )}

      {showNewCustomer && (
        <Modal title="New Customer" onClose={() => setShowNewCustomer(false)} width={380}>
          <form onSubmit={createCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>Name</label>
              <input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} required autoFocus />
            </div>
            <div>
              <label>Phone</label>
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowNewCustomer(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add</button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .pos-layout { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
        .pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }

        .pos-product-card {
          position: relative;
          text-align: left;
          color: var(--text-primary);
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 132px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .pos-product-card:hover:not(:disabled) {
          border-color: var(--accent-cyan);
          background: var(--bg-panel-raised);
          transform: translateY(-3px);
          box-shadow: var(--shadow-card-hover);
        }
        .pos-product-card:active:not(:disabled) { transform: translateY(-1px) scale(0.99); }
        .pos-product-card:disabled { opacity: 0.5; }

        .pos-product-cart-badge {
          position: absolute; top: -8px; right: -8px; min-width: 22px; height: 22px; padding: 0 6px;
          border-radius: 999px; background: var(--accent-cyan); color: var(--text-on-accent);
          font-family: var(--font-mono); font-size: 11.5px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25); z-index: 1;
        }

        .pos-product-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .pos-product-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono); font-weight: 700; font-size: 12.5px;
        }
        .pos-product-stock-chip {
          font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap; flex-shrink: 0;
          color: var(--status-delivered);
          background: color-mix(in srgb, var(--status-delivered) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--status-delivered) 35%, transparent);
        }
        .pos-product-stock-chip.low {
          color: var(--status-hold); background: var(--chip-urgent-bg); border-color: var(--chip-urgent-border);
        }
        .pos-product-stock-chip.out {
          color: var(--status-cancelled); background: var(--chip-overdue-bg); border-color: var(--chip-overdue-border);
        }

        .pos-product-name {
          font-size: 13.5px; font-weight: 700; line-height: 1.32; color: var(--text-primary);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .pos-product-sku { font-size: 10.5px; color: var(--text-muted); }
        .pos-product-footer { display: flex; align-items: baseline; gap: 5px; margin-top: auto; padding-top: 6px; border-top: 1px solid var(--border-hairline-soft); }
        .pos-product-price { font-size: 15px; font-weight: 800; color: var(--accent-cyan); }
        .pos-product-unit { font-size: 10.5px; color: var(--text-muted); }

        @media (min-width: 1400px) { .pos-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; } }
        @media (max-width: 1100px) { .pos-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; } }
        @media (max-width: 640px) { .pos-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } .pos-product-card { padding: 12px; min-height: 116px; } }
        @media (max-width: 380px) { .pos-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }

        .pos-cart { padding: 18px; display: flex; flex-direction: column; max-height: calc(100vh - 130px); overflow-y: auto; overflow-x: hidden; position: sticky; top: 24px; }
        .pos-cart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .pos-cart-head h3 { font-family: var(--font-display); font-size: 15px; margin: 0; display: flex; align-items: center; gap: 7px; }
        .pos-cart-items { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; min-height: 120px; margin-bottom: 12px; }
        .cart-line { display: grid; grid-template-columns: 1fr auto auto auto; gap: 8px; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border-hairline-soft); }
        .cart-line-name { font-size: 12.5px; font-weight: 600; }
        .cart-line-price { font-size: 10.5px; color: var(--text-muted); }
        .cart-line-qty { display: flex; align-items: center; gap: 6px; }
        .cart-line-qty button { width: 20px; height: 20px; border-radius: 5px; background: var(--bg-inset); border: 1px solid var(--border-hairline); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 0; }
        .cart-line-total { font-size: 12.5px; font-weight: 700; min-width: 55px; text-align: right; }
        .cart-line-remove { background: transparent; border: none; color: var(--text-muted); padding: 2px; }
        .cart-line-remove:hover { color: var(--status-cancelled); }

        .pos-field-row { display: flex; gap: 10px; align-items: flex-end; justify-content: space-between; }
        .pos-summary { margin-top: 12px; padding: 12px; background: var(--bg-inset); border-radius: 8px; display: flex; flex-direction: column; gap: 6px; }
        .pos-summary-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-secondary); }
        .pos-summary-total { font-size: 15px; font-weight: 700; color: var(--text-primary); padding-top: 6px; border-top: 1px solid var(--border-hairline-soft); }

        .hide-desktop { display: none; }
        .pos-cart-overlay { display: none; }

        @media (max-width: 1100px) {
          .pos-layout { grid-template-columns: 1fr; }
          .pos-cart-desktop { display: none; }
          .hide-desktop { display: inline-flex; }
          .pos-cart-overlay {
            display: flex; position: fixed; inset: 0; background: var(--overlay-scrim); z-index: 300;
            align-items: center; justify-content: center; padding: 20px;
          }
          .pos-cart-mobile-sheet { width: 100%; max-width: 480px; max-height: 88vh; }
          .pos-cart-mobile-sheet .pos-cart { border-radius: var(--radius-lg); max-height: 88vh; position: static; }
        }
      `}</style>
    </PageShell>
  );
}
