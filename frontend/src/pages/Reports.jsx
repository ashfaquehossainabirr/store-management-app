import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Percent, ShoppingBag, FileDown } from 'lucide-react';
import PageShell from '../components/PageShell';
import StatCard from '../components/StatCard';
import StatGrid from '../components/StatGrid';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { formatMoney } from '../utils/currency';
import { exportToCSV } from '../utils/csv';

function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(toInputDate(monthStart));
  const [to, setTo] = useState(toInputDate(today));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [symbol, setSymbol] = useState('$');

  useEffect(() => {
    api.get('/settings').then((res) => setSymbol(res.data.currencySymbol || '$'));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/reports/summary', { params: { from, to } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [from, to]);

  const maxDaily = data?.daily?.length ? Math.max(...data.daily.map((d) => d.revenue), 1) : 1;

  const exportCsv = () => {
    if (!data) return;
    exportToCSV(
      `sales-report-${from}-to-${to}.csv`,
      data.daily.map((d) => ({ Date: d._id, Revenue: d.revenue, Sales: d.salesCount }))
    );
  };

  return (
    <PageShell
      title="Reports & Analytics"
      subtitle="Revenue, profit, and performance across any date range."
      actions={
        <>
          <div className="report-daterange">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <span className="report-daterange-sep">–</span>
            <input type="date" value={to} min={from} max={toInputDate(today)} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn" onClick={exportCsv} disabled={!data}><FileDown size={15} /> Export CSV</button>
        </>
      }
    >
      {loading || !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      ) : (
        <>
          <StatGrid>
            <StatCard label="Revenue" value={formatMoney(data.totals.revenue, symbol)} sub={data.totals.refunded > 0 ? `${formatMoney(data.totals.refunded, symbol)} refunded` : 'Net of refunds'} icon={DollarSign} color="var(--accent-cyan)" />
            <StatCard label="Profit" value={formatMoney(data.totals.profit, symbol)} sub={`Cost: ${formatMoney(data.totals.cost, symbol)}`} icon={TrendingUp} color="var(--status-progress)" />
            <StatCard label="Margin" value={`${data.totals.marginPct.toFixed(1)}%`} sub="Profit ÷ revenue" icon={Percent} color="var(--accent-violet)" />
            <StatCard label="Sales" value={data.totals.salesCount} sub={`${data.totals.itemsSold} items sold`} icon={ShoppingBag} color="var(--status-hold)" />
          </StatGrid>

          <div className="card report-panel">
            <div className="report-panel-head"><h3>Revenue by Day</h3></div>
            <div className="report-chart">
              {data.daily.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>No sales in this range.</div>
              ) : (
                data.daily.map((d) => (
                  <div className="report-bar-wrap" key={d._id}>
                    <div className="report-bar-track">
                      <div className="report-bar" style={{ height: `${Math.max(4, (d.revenue / maxDaily) * 100)}%` }} title={formatMoney(d.revenue, symbol)} />
                    </div>
                    <span className="report-bar-label">{new Date(d._id).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="report-grid">
            <div className="card report-panel">
              <div className="report-panel-head"><h3>By Category</h3></div>
              {data.byCategory.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>No sales in this range.</div>
              ) : (
                <div className="table-wrap" style={{ border: 'none' }}>
                  <table>
                    <thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Profit</th></tr></thead>
                    <tbody>
                      {data.byCategory.map((c) => (
                        <tr key={c._id}>
                          <td>{c._id}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{c.qty}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{formatMoney(c.revenue, symbol)}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{formatMoney(c.profit, symbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card report-panel">
              <div className="report-panel-head"><h3>By Cashier</h3></div>
              {data.byCashier.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>No sales in this range.</div>
              ) : (
                <div className="table-wrap" style={{ border: 'none' }}>
                  <table>
                    <thead><tr><th>Cashier</th><th style={{ textAlign: 'right' }}>Sales</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
                    <tbody>
                      {data.byCashier.map((c) => (
                        <tr key={c._id}>
                          <td>{c._id || 'Unknown'}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{c.salesCount}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{formatMoney(c.revenue, symbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card report-panel" style={{ marginTop: 20 }}>
            <div className="report-panel-head"><h3>Top Products</h3></div>
            {data.topProducts.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>No sales in this range.</div>
            ) : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead><tr><th>Product</th><th style={{ textAlign: 'right' }}>Qty sold</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Profit</th></tr></thead>
                  <tbody>
                    {data.topProducts.map((p) => (
                      <tr key={p._id}>
                        <td>{p._id}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{p.qty}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{formatMoney(p.revenue, symbol)}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{formatMoney(p.profit, symbol)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .report-daterange { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .report-daterange input[type="date"] { width: auto; min-width: 0; flex: 1 1 130px; }
        .report-daterange-sep { color: var(--text-muted); font-size: 13px; flex-shrink: 0; }
        .report-panel { padding: 20px; min-width: 0; margin-top: 20px; }
        .report-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .report-panel-head h3 { font-family: var(--font-display); font-size: 15px; margin: 0; }
        .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .report-grid .report-panel { margin-top: 0; }
        .report-chart { display: flex; align-items: flex-end; gap: 6px; height: 160px; overflow-x: auto; padding-bottom: 2px; }
        .report-bar-wrap { flex: 1 0 22px; min-width: 22px; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; }
        .report-bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; background: var(--bg-inset); border-radius: 6px; overflow: hidden; }
        .report-bar { width: 100%; background: linear-gradient(180deg, var(--accent-cyan), var(--accent-cyan-dim)); border-radius: 6px 6px 0 0; transition: height 0.3s ease; }
        .report-bar-label { font-size: 9.5px; color: var(--text-muted); white-space: nowrap; }
        @media (max-width: 1000px) { .report-grid { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .report-panel-head { flex-direction: column; align-items: flex-start; gap: 6px; } }
      `}</style>
    </PageShell>
  );
}
