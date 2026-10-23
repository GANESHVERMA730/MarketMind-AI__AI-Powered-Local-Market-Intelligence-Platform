const { Product } = require('../models/Product');
const { Sale } = require('../models/Sale');
const { SALE_STATUSES } = require('../constants/sales');
const { resolveDateRange, toDateKey, addUtcDays } = require('../utils/dateRange');
const { toMoney } = require('../utils/money');
const { toPublicProduct } = require('../utils/productResponse');
const { toPublicSale } = require('../utils/saleResponse');

function completedSalesMatch(userId, from, to) {
  return {
    userId,
    status: SALE_STATUSES.COMPLETED,
    soldAt: { $gte: from, $lt: to },
  };
}

async function summarizeSales(userId, from, to) {
  const [summary] = await Sale.aggregate([
    { $match: completedSalesMatch(userId, from, to) },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$total' },
        cogs: { $sum: '$cogs' },
        orderCount: { $sum: 1 },
        unitsSold: { $sum: { $sum: '$items.quantity' } },
      },
    },
  ]);

  const revenue = toMoney(summary ? summary.revenue : 0);
  const cogs = toMoney(summary ? summary.cogs : 0);

  return {
    revenue,
    cogs,
    grossProfit: toMoney(revenue - cogs),
    orderCount: summary ? summary.orderCount : 0,
    unitsSold: summary ? summary.unitsSold : 0,
  };
}

async function dailyTrend(userId, from, to) {
  const rows = await Sale.aggregate([
    { $match: completedSalesMatch(userId, from, to) },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt', timezone: 'UTC' } },
        revenue: { $sum: '$total' },
        cogs: { $sum: '$cogs' },
        orderCount: { $sum: 1 },
        unitsSold: { $sum: { $sum: '$items.quantity' } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row]));
  const trend = [];
  for (let cursor = new Date(from); cursor < to; cursor = addUtcDays(cursor, 1)) {
    const key = toDateKey(cursor);
    const row = byDay.get(key);
    const revenue = toMoney(row ? row.revenue : 0);
    const cogs = toMoney(row ? row.cogs : 0);
    trend.push({
      date: key,
      revenue,
      cogs,
      grossProfit: toMoney(revenue - cogs),
      orderCount: row ? row.orderCount : 0,
      unitsSold: row ? row.unitsSold : 0,
    });
  }
  return trend;
}

async function productMovement(userId, from, to) {
  const sold = await Sale.aggregate([
    { $match: completedSalesMatch(userId, from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        sku: { $first: '$items.sku' },
        category: { $first: '$items.category' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
        cogs: { $sum: '$items.lineCogs' },
      },
    },
  ]);

  return sold.map((row) => ({
    productId: String(row._id),
    productName: row.productName,
    sku: row.sku,
    category: row.category,
    unitsSold: row.unitsSold,
    revenue: toMoney(row.revenue),
    cogs: toMoney(row.cogs),
    grossProfit: toMoney(row.revenue - row.cogs),
  }));
}

async function categoryPerformance(userId, from, to) {
  const rows = await Sale.aggregate([
    { $match: completedSalesMatch(userId, from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
        cogs: { $sum: '$items.lineCogs' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return rows.map((row) => ({
    category: row._id,
    unitsSold: row.unitsSold,
    revenue: toMoney(row.revenue),
    cogs: toMoney(row.cogs),
    grossProfit: toMoney(row.revenue - row.cogs),
  }));
}

async function getDashboard(userId, query) {
  const range = resolveDateRange(query);
  const { from, to, preset } = range;

  const [metrics, trend, movement, categories, lowStockDocs, recentDocs, activeProducts] =
    await Promise.all([
      summarizeSales(userId, from, to),
      dailyTrend(userId, from, to),
      productMovement(userId, from, to),
      categoryPerformance(userId, from, to),
      Product.find({
        userId,
        isActive: true,
        $expr: { $lte: ['$stockQuantity', '$minStockThreshold'] },
      })
        .sort({ stockQuantity: 1 })
        .limit(10),
      Sale.find(completedSalesMatch(userId, from, to)).sort({ soldAt: -1 }).limit(5),
      Product.find({ userId, isActive: true }).select(
        'name sku category stockQuantity minStockThreshold'
      ),
    ]);

  const soldMap = new Map(movement.map((row) => [row.productId, row]));
  const slowMoving = activeProducts
    .map((product) => {
      const sold = soldMap.get(String(product._id));
      return {
        productId: String(product._id),
        productName: product.name,
        sku: product.sku,
        category: product.category,
        unitsSold: sold ? sold.unitsSold : 0,
        revenue: sold ? sold.revenue : 0,
        currentStock: product.stockQuantity,
      };
    })
    .sort((a, b) => a.unitsSold - b.unitsSold || a.productName.localeCompare(b.productName))
    .slice(0, 5);

  const bestSelling = [...movement].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);

  return {
    range: {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      inclusiveNote:
        'from is inclusive. to is exclusive (the day after a YYYY-MM-DD end date, in UTC). Cancelled sales are excluded.',
    },
    metrics,
    definitions: {
      revenue: 'Sum of completed sale line quantities × recorded selling prices.',
      cogs: 'Sum of completed sale line quantities × recorded cost prices.',
      grossProfit: 'Revenue minus COGS. This is not net profit.',
      netProfit:
        'Not calculated. Net profit would require operating expenses, which are not recorded in this version.',
    },
    dailyTrend: trend,
    bestSelling,
    slowMoving,
    categoryPerformance: categories,
    lowStock: lowStockDocs.map(toPublicProduct),
    recentSales: recentDocs.map(toPublicSale),
    empty: metrics.orderCount === 0,
  };
}

module.exports = {
  getDashboard,
  summarizeSales,
  dailyTrend,
  productMovement,
  categoryPerformance,
  completedSalesMatch,
};
