import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Package, AlertTriangle, Users, TrendingUp, ClipboardList } from 'lucide-react';
import PageShell from '../components/PageShell';
import StatCard from '../components/StatCard';
import StatGrid from '../components/StatGrid';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [symbol, setSymbol] = useState('$');

  useEffect(() => {
    Promise.all([api.get('/dashboard/summary'), api.get('/settings')])
      .then(([summaryRes, settingsRes]) => {
        setData(summaryRes.data);
        setSymbol(settingsRes.data.currencySymbol || '$');
      })
      .finally(() => setLoading(false));
  }, []);

  const maxWeekRevenue = data?.weekSales?.length ? Math.max(...data.weekSales.map((d) => d.revenue), 1) : 1;

  return (
    <PageShell
      title={`Welcome back, ${user?.name?.split(' ')[0] || ''}`}
      subtitle="Here's how your store is doing today."
      actions={
        <Link to="/pos" className="btn btn-primary btn-new-sale">
          <ShoppingBag size={15} /> New Sale
        </Link>
      }
    >
      {loading || !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner size={28} />
        </div>
      ) : (
        <>
          <StatGrid>
            <StatCard label="Today's Revenue" value={formatMoney(data.todayRevenue, symbol)} sub={`${data.todaySales} sale${data.todaySales === 1 ? '' : 's'} today`} icon={DollarSign} color="var(--accent-cyan)" />
            <StatCard label="This Month" value={formatMoney(data.monthRevenue, symbol)} sub={`${data.monthSales} sale${data.monthSales === 1 ? '' : 's'} this month`} icon={TrendingUp} color="var(--status-progress)" />
            <StatCard label="Products" value={data.totalProducts} sub={`${data.lowStockCount} low on stock`} icon={Package} color="var(--status-hold)" />
            <StatCard label="Customers" value={data.totalCustomers} sub="Registered customers" icon={Users} color="var(--accent-violet)" />
          </StatGrid>

          <div className="dash-grid">
            <div className="card dash-panel">
              <div className="panel-head">
                <h3>Last 7 Days</h3>
              </div>
              <div className="week-chart">
                {data.weekSales.length === 0 && <div className="empty-state" style={{ padding: 30 }}>No sales yet this week.</div>}
                {data.weekSales.map((d) => (
                  <div className="week-bar-wrap" key={d._id}>
                    <div className="week-bar-track">
                      <div className="week-bar" style={{ height: `${Math.max(4, (d.revenue / maxWeekRevenue) * 100)}%` }} title={formatMoney(d.revenue, symbol)} />
                    </div>
                    <span className="week-bar-label">
                      {new Date(d._id).toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card dash-panel">
              <div className="panel-head">
                <h3>Top Products</h3>
              </div>
              {data.topProducts.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>No sales recorded yet.</div>
              ) : (
                <div className="top-products">
                  {data.topProducts.map((p, i) => (
                    <div className="top-product-row" key={p._id}>
                      <span className="top-product-rank">{i + 1}</span>
                      <span className="top-product-name">{p._id}</span>
                      <span className="top-product-qty mono">{p.quantitySold} sold</span>
                      <span className="top-product-revenue mono">{formatMoney(p.revenue, symbol)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dash-grid" style={{ marginTop: 20 }}>
            <div className="card dash-panel">
              <div className="panel-head">
                <h3>Recent Sales</h3>
                <Link to="/invoices" className="panel-link">View all</Link>
              </div>
              {data.recentSales.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>No sales yet.</div>
              ) : (
                <div className="table-wrap" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSales.map((s) => (
                        <tr key={s._id}>
                          <td><Link to={`/invoices/${s._id}`} className="mono" style={{ color: 'var(--accent-cyan)' }}>{s.invoiceNumber}</Link></td>
                          <td>{s.customerName}</td>
                          <td>
                            <span className="badge" style={{
                              color: s.paymentStatus === 'paid' ? 'var(--status-delivered)' : s.paymentStatus === 'partial' ? 'var(--status-hold)' : 'var(--status-cancelled)',
                              background: s.paymentStatus === 'paid' ? 'color-mix(in srgb, var(--status-delivered) 14%, transparent)' : s.paymentStatus === 'partial' ? 'var(--chip-urgent-bg)' : 'var(--chip-overdue-bg)',
                              border: `1px solid ${s.paymentStatus === 'paid' ? 'color-mix(in srgb, var(--status-delivered) 40%, transparent)' : s.paymentStatus === 'partial' ? 'var(--chip-urgent-border)' : 'var(--chip-overdue-border)'}`,
                            }}>{s.paymentStatus}</span>
                          </td>
                          <td style={{ textAlign: 'right' }} className="mono">{formatMoney(s.total, symbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card dash-panel">
              <div className="panel-head">
                <h3><AlertTriangle size={15} style={{ verticalAlign: -2, color: 'var(--status-hold)' }} /> Low Stock Alert</h3>
                <Link to="/products" className="panel-link">Manage</Link>
              </div>
              {data.lowStockCount === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>All products are well stocked.</div>
              ) : (
                <>
                  <div className="low-stock-note">
                    {data.lowStockCount} product{data.lowStockCount === 1 ? '' : 's'} at or below reorder level.
                  </div>
                  <Link to="/purchases?reorder=1" className="btn btn-primary" style={{ marginTop: 10, justifyContent: 'center' }}>
                    <ClipboardList size={14} /> Create Purchase Order
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .dash-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; }
        @media (max-width: 1000px) { .dash-grid { grid-template-columns: 1fr; } }
        .dash-panel { padding: 20px; min-width: 0; }
        .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .panel-head h3 { font-family: var(--font-display); font-size: 15px; margin: 0; display: flex; align-items: center; gap: 6px; }
        .panel-link { font-size: 12.5px; color: var(--accent-cyan); font-weight: 600; }
        .week-chart { display: flex; align-items: flex-end; gap: 10px; height: 160px; }
        .week-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; }
        .week-bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; background: var(--bg-inset); border-radius: 6px; overflow: hidden; }
        .week-bar { width: 100%; background: linear-gradient(180deg, var(--accent-cyan), var(--accent-cyan-dim)); border-radius: 6px 6px 0 0; transition: height 0.3s ease; }
        .week-bar-label { font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; }
        .top-products { display: flex; flex-direction: column; gap: 2px; }
        .top-product-row { display: grid; grid-template-columns: 22px 1fr auto auto; gap: 10px; align-items: center; padding: 9px 4px; font-size: 13px; border-bottom: 1px solid var(--border-hairline-soft); }
        .top-product-row:last-child { border-bottom: none; }
        .top-product-rank { color: var(--text-muted); font-weight: 700; font-size: 12px; }
        .top-product-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .top-product-qty { color: var(--text-secondary); font-size: 11.5px; }
        .top-product-revenue { color: var(--accent-cyan); font-weight: 700; font-size: 12.5px; }
        .low-stock-note { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; padding: 6px 2px; }
      `}</style>
    </PageShell>
  );
}
