import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ReceiptText, RotateCcw, Trash2 } from 'lucide-react';
import api, { getApiError } from '../api/http';
import { EmptyState, ErrorNotice, Loading, PageHeading } from '../components/common';
import { formatCurrency, formatDateTime } from '../utils/format';

const newLine = () => ({ productId: '', quantity: 1 });
const newRequestId = () => globalThis.crypto?.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [items, setItems] = useState([newLine()]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [filterStatus, setFilterStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clientRequestId, setClientRequestId] = useState(newRequestId);

  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      if (from && to) {
        params.from = from;
        params.to = to;
      }
      const [productResponse, salesResponse] = await Promise.all([
        api.get('/products', { params: { limit: 100 } }),
        api.get('/sales', { params }),
      ]);
      setProducts(productResponse.data.data.items);
      setSales(salesResponse.data.data.items);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, from, to]);

  useEffect(() => { loadData(); }, [loadData]);

  const estimate = items.reduce((sum, item) => {
    const product = activeProducts.find((candidate) => candidate.id === item.productId);
    return sum + (product ? product.sellingPrice * (Number(item.quantity) || 0) : 0);
  }, 0);
  const canSubmit = items.length > 0 && items.every((item) => item.productId && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0);

  function updateLine(index, changes) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }

  async function submitSale(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!canSubmit) {
      setError('Choose a product and enter a positive whole-number quantity for every line.');
      return;
    }
    const duplicateIds = items.map((item) => item.productId);
    if (new Set(duplicateIds).size !== duplicateIds.length) {
      setError('Each product can appear once per sale. Combine duplicate quantities into one line.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post('/sales', {
        items: items.map(({ productId, quantity }) => ({ productId, quantity: Number(quantity) })),
        paymentMethod,
        clientRequestId,
      });
      setNotice(`Sale recorded. Total: ${formatCurrency(response.data.data.sale.total)}.`);
      setItems([newLine()]);
      setClientRequestId(newRequestId());
      await loadData();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelSale(sale) {
    if (!window.confirm(`Cancel this ${formatCurrency(sale.total)} sale and restore its stock?`)) return;
    setError('');
    setNotice('');
    try {
      const { data } = await api.post(`/sales/${sale.id}/cancel`, { reason: 'Cancelled from sales history' });
      setNotice(data.message || 'Sale cancelled and stock restored.');
      await loadData();
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }

  return (
    <>
      <PageHeading eyebrow="Transactions" title="Sales" description="Record a sale once. Stock updates with it, and your history stays connected." />
      <ErrorNotice message={error} onRetry={loadData} />
      {notice && <div className="mb-5 rounded-xl border border-[#cde1d0] bg-[#edf5ee] px-4 py-3 text-sm text-forest" role="status">{notice}</div>}

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={submitSale} className="rounded-2xl border border-line bg-white p-5 shadow-card/50 sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf5ee] text-forest"><ReceiptText size={19} /></span>
            <div><h2 className="font-bold">New sale</h2><p className="mt-1 text-xs leading-5 text-muted">Prices and totals are confirmed by the server.</p></div>
          </div>
          {activeProducts.length === 0 ? (
            <EmptyState title="Add products to start selling" description="Create an active product in your inventory before recording a sale." />
          ) : <>
            <div className="space-y-3">
              {items.map((item, index) => {
                const selected = activeProducts.find((product) => product.id === item.productId);
                return <div key={index} className="grid grid-cols-[minmax(0,1fr)_84px_38px] items-end gap-2">
                  <label className="min-w-0 text-xs font-semibold text-muted">
                    <span>Product {index + 1}</span>
                    <select className="select-input form-input" value={item.productId} onChange={(event) => updateLine(index, { productId: event.target.value })} required>
                      <option value="">Select a product</option>
                      {activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.stockQuantity} in stock</option>)}
                    </select>
                    {selected && <span className="mt-1 block text-[11px] font-normal text-muted">{formatCurrency(selected.sellingPrice)} each</span>}
                  </label>
                  <label className="text-xs font-semibold text-muted">
                    <span>Qty</span>
                    <input className="form-input text-center" type="number" min="1" step="1" max={selected?.stockQuantity} value={item.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} required />
                  </label>
                  <button type="button" className="icon-button mb-1 text-muted" aria-label={`Remove product line ${index + 1}`} onClick={() => setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : [newLine()])}><Trash2 size={16} /></button>
                </div>;
              })}
            </div>
            <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline" onClick={() => setItems((current) => [...current, newLine()])}><Plus size={16} /> Add another product</button>
            <label className="mt-5 block text-sm font-semibold text-ink">Payment method
              <select className="select-input form-input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="other">Other</option>
              </select>
            </label>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-canvas px-4 py-3"><span className="text-sm font-medium text-muted">Estimated total</span><span className="text-lg font-bold">{formatCurrency(estimate)}</span></div>
            <p className="mt-2 text-[11px] leading-5 text-muted">Final sale totals are calculated from current server product prices.</p>
            <button className="primary-button mt-5 w-full justify-center" disabled={submitting || !canSubmit}>{submitting ? 'Recording sale…' : 'Record sale'}</button>
          </>}
        </form>

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card/50">
          <div className="border-b border-line p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-bold">Transaction history</h2><p className="mt-1 text-xs text-muted">Your shop’s recorded sales</p></div>
              <button className="icon-button" title="Refresh history" onClick={loadData}><RotateCcw size={16} /></button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <label className="text-[11px] font-semibold text-muted">Status<select className="select-input form-input !mt-1 !py-2 text-xs" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="">All sales</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
              <label className="text-[11px] font-semibold text-muted">From<input type="date" className="form-input !mt-1 !py-2 text-xs" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
              <label className="text-[11px] font-semibold text-muted">To<input type="date" className="form-input !mt-1 !py-2 text-xs" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
            </div>
            {(Boolean(from) !== Boolean(to)) && <p className="mt-2 text-xs text-[#9b682b]">Choose both dates to filter the transaction period.</p>}
          </div>
          <div className="max-h-[740px] overflow-y-auto">
            {loading ? <Loading label="Loading transactions…" /> : sales.length ? <div className="divide-y divide-line">
              {sales.map((sale) => <article key={sale.id} className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-bold">{formatDateTime(sale.soldAt)}</p><p className="mt-1 text-xs text-muted">{sale.items.reduce((sum, item) => sum + item.quantity, 0)} item(s) · {sale.paymentMethod.toUpperCase()}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${sale.status === 'completed' ? 'bg-[#edf5ee] text-forest' : 'bg-[#f2f0ee] text-muted'}`}>{sale.status}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {sale.items.map((item) => <div key={`${sale.id}-${item.productId}`} className="flex justify-between gap-3 text-xs"><span className="min-w-0 truncate text-muted">{item.productName} <span className="text-muted/70">× {item.quantity}</span></span><span className="shrink-0 font-medium">{formatCurrency(item.lineTotal)}</span></div>)}
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                  <div><p className="text-[11px] text-muted">Gross profit · {formatCurrency(sale.grossProfit)}</p><p className="mt-1 text-xs text-muted">COGS · {formatCurrency(sale.cogs)}</p></div>
                  <div className="text-right"><p className="text-xs text-muted">Total</p><p className="text-lg font-bold">{formatCurrency(sale.total)}</p></div>
                </div>
                {sale.status === 'completed' && <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline" onClick={() => cancelSale(sale)}><RotateCcw size={13} /> Cancel and restore stock</button>}
                {sale.status === 'cancelled' && sale.cancelReason && <p className="mt-3 text-xs text-muted">Reason: {sale.cancelReason}</p>}
              </article>)}
            </div> : <EmptyState title="No transactions found" description={filterStatus || from || to ? 'Try changing the selected filters.' : 'Completed sales will show here after you record them.'} />}
          </div>
        </section>
      </section>
    </>
  );
}
