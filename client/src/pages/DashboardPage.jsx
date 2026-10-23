
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Boxes,
  BrainCircuit,
  CircleDollarSign,
  ClipboardList,
  Package,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { getApiError } from '../api/http';
import { ErrorNotice, Loading, PageHeading, EmptyState } from '../components/common';
import { formatCurrency, formatDate } from '../utils/format';

const COLORS = ['#1d6049', '#cce878', '#7eb69a', '#d3a75e', '#87a9a0', '#bfcec4'];

export default function DashboardPage() {
  const [preset, setPreset] = useState('month');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/analytics/dashboard', {
        params: { preset },
      });
      setDashboard(data.data.dashboard);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const forecastProducts = [
    ...(dashboard?.bestSelling || []),
    ...(dashboard?.lowStock || []),
  ].filter(
    (product, index, array) =>
      (product.productId || product.id) &&
      array.findIndex(
        (item) =>
          (item.productId || item.id) ===
          (product.productId || product.id)
      ) === index
  );

  useEffect(() => {
    if (!forecastProducts.length) {
      setForecast(null);
      return;
    }

    const productId =
      selectedProductId ||
      forecastProducts[0].productId ||
      forecastProducts[0].id;

    let cancelled = false;

    async function loadForecast() {
      setForecastLoading(true);
      setForecastError('');

      try {
        const { data } = await api.get(`/forecasts/${productId}`, {
          params: { days: 7 },
        });

        if (!cancelled) {
          setForecast(data.data);
          setSelectedProductId(productId);
        }
      } catch (requestError) {
        if (!cancelled) {
          setForecast(null);
          setForecastError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) setForecastLoading(false);
      }
    }

    loadForecast();

    return () => {
      cancelled = true;
    };
  }, [dashboard, selectedProductId]);

  const metrics = dashboard?.metrics;

  const cards = [
    {
      label: 'Revenue',
      value: formatCurrency(metrics?.revenue),
      caption: 'Completed sales',
      icon: CircleDollarSign,
      tone: 'bg-[#e8f2e9] text-forest',
    },
    {
      label: 'Gross profit',
      value: formatCurrency(metrics?.grossProfit),
      caption: 'Revenue minus COGS',
      icon: TrendingUp,
      tone: 'bg-[#f2f6df] text-[#647c23]',
    },
    {
      label: 'Orders',
      value: metrics?.orderCount ?? '—',
      caption: 'Completed transactions',
      icon: ClipboardList,
      tone: 'bg-[#eef0fa] text-[#59639a]',
    },
    {
      label: 'Units sold',
      value: metrics?.unitsSold ?? '—',
      caption: 'Items sold in this period',
      icon: Boxes,
      tone: 'bg-[#fbf0e4] text-[#9c6b2d]',
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Your shop at a glance"
        title="Good business starts with clarity."
        description={
          dashboard
            ? `Here’s how your shop is doing from ${formatDate(
                dashboard.range.from
              )} to ${formatDate(
                new Date(new Date(dashboard.range.to).getTime() - 86400000)
              )}.`
            : 'Your analytics are calculated from your completed sales and current inventory.'
        }
        action={
          <label className="flex items-center gap-2 text-sm font-semibold text-muted">
            <span className="sr-only">Analytics period</span>
            <select
              className="select-input min-w-36"
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
            >
              <option value="day">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </label>
        }
      />

      <ErrorNotice message={error} onRetry={loadDashboard} />

      {loading ? (
        <Loading />
      ) : (
        dashboard && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(({ label, value, caption, icon: Icon, tone }) => (
                <article
                  key={label}
                  className="rounded-2xl border border-line bg-white p-5 shadow-card/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted">{label}</p>
                      <p className="mt-3 text-2xl font-bold tracking-tight text-ink">
                        {value}
                      </p>
                    </div>
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
                    >
                      <Icon size={19} />
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-muted">{caption}</p>
                </article>
              ))}
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
              <article className="rounded-2xl border border-line bg-white p-5 shadow-card/50 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">Revenue & gross profit</h2>
                    <p className="mt-1 text-xs text-muted">
                      Daily totals for the selected period
                    </p>
                  </div>
                  <span className="rounded-full bg-[#edf5ee] px-3 py-1.5 text-xs font-semibold text-forest">
                    From sales
                  </span>
                </div>

                {dashboard.dailyTrend.length ? (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dashboard.dailyTrend}
                        margin={{ top: 8, right: 10, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid stroke="#edf0eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => value.slice(5)}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#77817b', fontSize: 11 }}
                          minTickGap={22}
                        />
                        <YAxis
                          tickFormatter={(value) => `₹${value}`}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#77817b', fontSize: 11 }}
                          width={58}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatCurrency(value),
                            name === 'revenue' ? 'Revenue' : 'Gross profit',
                          ]}
                          labelFormatter={(label) =>
                            formatDate(`${label}T00:00:00`)
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#1d6049"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="grossProfit"
                          name="Gross profit"
                          stroke="#a2c853"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No trend for this period"
                    description="Completed sale data will appear here."
                  />
                )}
              </article>

              <article className="rounded-2xl border border-line bg-white p-5 shadow-card/50 sm:p-6">
                <div className="mb-3">
                  <h2 className="font-bold">Sales by category</h2>
                  <p className="mt-1 text-xs text-muted">
                    Revenue from completed sales
                  </p>
                </div>

                {dashboard.categoryPerformance.length ? (
                  <>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboard.categoryPerformance}
                            dataKey="revenue"
                            nameKey="category"
                            innerRadius={56}
                            outerRadius={88}
                            paddingAngle={3}
                          >
                            {dashboard.categoryPerformance.map((item, index) => (
                              <Cell
                                key={item.category}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {dashboard.categoryPerformance.slice(0, 5).map(
                        (category, index) => (
                          <div
                            key={category.category}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2 capitalize text-muted">
                              <i
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: COLORS[index % COLORS.length],
                                }}
                              />
                              <span className="truncate">
                                {category.category.replaceAll('_', ' ')}
                              </span>
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(category.revenue)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="No category data yet"
                    description="A chart will appear after your first sale."
                  />
                )}
              </article>
            </section>

            <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-card/50 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BrainCircuit size={20} className="text-forest" />
                    <h2 className="font-bold">AI Demand Forecast</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Predicted product demand for the next 7 days
                  </p>
                </div>

                <select
                  className="select-input min-w-44"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  disabled={!forecastProducts.length}
                >
                  {forecastProducts.length ? (
                    forecastProducts.map((product) => (
                      <option
                        key={product.productId || product.id}
                        value={product.productId || product.id}
                      >
                        {product.productName || product.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No products available</option>
                  )}
                </select>
              </div>

              {forecastLoading ? (
                <Loading />
              ) : forecastError ? (
                <ErrorNotice message={forecastError} />
              ) : forecast?.predictions?.length ? (
                <>
                  <p className="mb-3 text-sm font-semibold text-ink">
                    {forecast.product_name || 'Selected product'}
                  </p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecast.predictions}>
                        <CartesianGrid stroke="#edf0eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => value.slice(5)}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#77817b', fontSize: 11 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#77817b', fontSize: 11 }}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="predicted_demand"
                          name="Predicted demand"
                          stroke="#1d6049"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Forecast unavailable"
                  description="Select a product with demand history to see its prediction."
                />
              )}
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <ProductList
                title="Best-selling products"
                subtitle="By units sold in this period"
                products={dashboard.bestSelling}
                metricLabel="units"
                positive
              />
              <ProductList
                title="Stock to keep an eye on"
                subtitle="Products at or below their threshold"
                products={dashboard.lowStock}
                lowStock
              />
            </section>

            <p className="mt-5 text-xs leading-5 text-muted">
              Gross profit is revenue minus cost of goods sold; it is not net
              profit. Forecast values are model estimates, not guarantees.
              Dashboard values are derived from completed sales only.
            </p>
          </>
        )
      )}
    </>
  );
}

function ProductList({ title, subtitle, products, metricLabel, positive, lowStock }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-card/50 sm:p-6">
      <div className="mb-5">
        <h2 className="font-bold">{title}</h2>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>

      {products.length ? (
        <div className="divide-y divide-line">
          {products.map((product) => (
            <div
              key={product.productId || product.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    lowStock
                      ? 'bg-[#fff4e8] text-[#a56c29]'
                      : 'bg-[#edf5ee] text-forest'
                  }`}
                >
                  <Package size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {product.productName || product.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {product.sku}
                    {product.category
                      ? ` · ${product.category.replaceAll('_', ' ')}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={`text-sm font-bold ${
                    lowStock ? 'text-[#a56c29]' : 'text-ink'
                  }`}
                >
                  {lowStock
                    ? `${product.stockQuantity} left`
                    : product.unitsSold ?? product.stockQuantity}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {lowStock
                    ? `Threshold ${product.minStockThreshold}`
                    : metricLabel || 'in stock'}
                </p>
              </div>

              {positive && (
                <span className="hidden text-forest sm:inline">
                  <ArrowUpRight size={16} />
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={lowStock ? 'Stock levels look good' : 'No sales in this period'}
          description={
            lowStock
              ? 'No active products are below their stock threshold.'
              : 'Your best sellers will appear after you record sales.'
          }
        />
      )}
    </article>
  );
}
