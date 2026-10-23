const { Product } = require('../src/models/Product');
const { Sale } = require('../src/models/Sale');
const { SyntheticMarketPrice } = require('../src/models/SyntheticMarketPrice');
const { DemoSeedRun } = require('../src/models/DemoSeedRun');
const { User } = require('../src/models/User');
const { createDemoPlan, getSeasonFactor } = require('../scripts/demoDataGenerator');
const { seedDemo } = require('../scripts/seedDemo');
const { startMemoryDb, stopMemoryDb, clearCollections } = require('./helpers/memoryDb');

const HISTORY_END = '2026-08-31';

function comparablePlan(plan) {
  return {
    shops: plan.shops,
    users: plan.users,
    products: plan.products,
    sales: plan.sales,
    marketPrices: plan.marketPrices,
    productRecords: plan.productRecords,
  };
}

describe('synthetic demo data generation', () => {
  beforeAll(async () => {
    await startMemoryDb();
  });

  afterAll(async () => {
    await stopMemoryDb();
  });

  afterEach(async () => {
    await clearCollections();
  });

  test('builds a repeatable 10-shop, 40-product, 270-day plan with seasonal and slow-moving demand', () => {
    const options = { seed: 42, endDate: HISTORY_END };
    const first = createDemoPlan(options);
    const second = createDemoPlan(options);

    expect(comparablePlan(first)).toEqual(comparablePlan(second));
    expect(first.shops).toHaveLength(10);
    expect(first.products).toHaveLength(400);
    expect(first.productRecords).toHaveLength(400);
    expect(first.sales.length).toBeGreaterThanOrEqual(10 * 270);
    expect(first.marketPrices).toHaveLength(10 * 40);
    expect(first.historyEnd.toISOString().slice(0, 10)).toBe(HISTORY_END);
    expect(first.historyStart.getTime()).toBeLessThan(first.historyEnd.getTime());

    const weekendSaleCount = new Map();
    const weekdaySaleCount = new Map();
    first.sales.forEach((sale) => {
      const day = sale.soldAt.getUTCDay();
      const counts = day === 0 || day === 6 ? weekendSaleCount : weekdaySaleCount;
      counts.set(day, (counts.get(day) || 0) + 1);
    });
    const average = (values) => [...values.values()].reduce((sum, count) => sum + count, 0) / values.size;
    expect(average(weekendSaleCount)).toBeGreaterThan(average(weekdaySaleCount));
    expect(getSeasonFactor('beverages', new Date('2026-05-10T00:00:00.000Z'))).toBeGreaterThan(
      getSeasonFactor('beverages', new Date('2026-01-10T00:00:00.000Z'))
    );

    const slowUnits = [];
    const regularUnits = [];
    first.products.forEach((product) => {
      const skuIndex = Number(product.sku.slice(-3)) - 1;
      const record = first.productRecords.find((item) => String(item.productId) === String(product._id));
      (skuIndex % 5 === 0 ? slowUnits : regularUnits).push(record.soldUnits);
    });
    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean(slowUnits)).toBeLessThan(mean(regularUnits));
    expect(first.productRecords.filter((record) => record.endingStock < 5)).toHaveLength(40);
    expect(first.products.every((product) => product.category && product.sellingPrice > product.costPrice)).toBe(true);
  });

  test('persists valid completed sales, consistent stock, isolated market observations, and safe reset', async () => {
    const options = {
      seed: 7,
      endDate: HISTORY_END,
      historyDays: 180,
      shopCount: 2,
      productsPerShop: 12,
    };
    const generated = await seedDemo(options);
    const run = await DemoSeedRun.findOne({ seed: options.seed });
    expect(generated.counts).toMatchObject({ shops: 2, products: 24, marketPrices: 120 });
    expect(run.status).toBe('completed');

    const [users, products, sales, marketPrices] = await Promise.all([
      User.find({ _id: { $in: run.generatedUserIds } }).select('+password'),
      Product.find({ _id: { $in: run.productIds } }),
      Sale.find({ _id: { $in: run.saleIds } }),
      SyntheticMarketPrice.find({ seedRunKey: run.runKey }).lean(),
    ]);

    expect(users).toHaveLength(2);
    expect(users.every((user) => user.password.startsWith('$2'))).toBe(true);
    expect(products).toHaveLength(24);
    expect(sales).toHaveLength(run.counts.sales);
    expect(sales.every((sale) => sale.status === 'completed' && sale.stockRestored === false)).toBe(true);
    expect(marketPrices).toHaveLength(120);
    expect(marketPrices.every((price) => price.sourceLabel === 'synthetic-demo' && price.userId === undefined)).toBe(true);

    const productById = new Map(products.map((product) => [String(product._id), product]));
    const soldByProduct = new Map();
    sales.forEach((sale) => {
      let subtotal = 0;
      let cogs = 0;
      sale.items.forEach((item) => {
        const product = productById.get(String(item.productId));
        expect(product).toBeDefined();
        expect(String(product.userId)).toBe(String(sale.userId));
        expect(item.sellingPrice).toBe(product.sellingPrice);
        expect(item.costPrice).toBe(product.costPrice);
        expect(item.lineTotal).toBe(Math.round(item.quantity * item.sellingPrice * 100) / 100);
        expect(item.lineCogs).toBe(Math.round(item.quantity * item.costPrice * 100) / 100);
        subtotal += item.lineTotal;
        cogs += item.lineCogs;
        soldByProduct.set(
          String(item.productId),
          (soldByProduct.get(String(item.productId)) || 0) + item.quantity
        );
      });
      expect(sale.total).toBe(sale.subtotal);
      expect(sale.subtotal).toBe(Math.round(subtotal * 100) / 100);
      expect(sale.cogs).toBe(Math.round(cogs * 100) / 100);
      expect(sale.grossProfit).toBe(Math.round((sale.subtotal - sale.cogs) * 100) / 100);
    });

    run.productRecords.forEach((record) => {
      expect(soldByProduct.get(String(record.productId)) || 0).toBe(record.soldUnits);
      expect(record.openingStock - record.soldUnits).toBe(record.endingStock);
      expect(productById.get(String(record.productId)).stockQuantity).toBe(record.endingStock);
    });

    await expect(seedDemo(options)).rejects.toThrow(/already exists/i);
    expect(await Sale.countDocuments({ _id: { $in: run.saleIds } })).toBe(run.counts.sales);

    await seedDemo({ ...options, reset: true });
    expect(await User.countDocuments({ _id: { $in: run.generatedUserIds } })).toBe(2);
    expect(await Product.countDocuments({ _id: { $in: run.productIds } })).toBe(24);
    expect(await Sale.countDocuments({ _id: { $in: run.saleIds } })).toBe(run.counts.sales);
    expect(await SyntheticMarketPrice.countDocuments({ seedRunKey: run.runKey })).toBe(120);
    expect(await DemoSeedRun.countDocuments({ seed: options.seed, status: 'completed' })).toBe(1);
  });

  test('attaches seed records to an existing account without changing or deleting its private data', async () => {
    const user = await User.create({
      name: 'Local Demo User',
      email: 'local@example.com',
      password: 'local-demo-password',
      shopName: 'My Local Shop',
    });
    const existingProduct = await Product.create({
      userId: user._id,
      name: 'My own product',
      sku: 'OWN-001',
      category: 'other',
      costPrice: 1,
      sellingPrice: 2,
      stockQuantity: 3,
    });
    const options = {
      seed: 17,
      endDate: HISTORY_END,
      historyDays: 180,
      shopCount: 2,
      productsPerShop: 12,
      demoEmail: 'LOCAL@example.com',
    };

    const result = await seedDemo(options);
    const run = await DemoSeedRun.findOne({ seed: options.seed });
    expect(result.linkedExistingAccount).toBe(true);
    expect(run.generatedUserIds).toHaveLength(1);
    expect(run.shops[0].linkedToExistingAccount).toBe(true);
    expect(await Product.findById(existingProduct._id)).not.toBeNull();
    expect(await Product.countDocuments({ userId: user._id })).toBe(13);

    await seedDemo({ ...options, reset: true });
    expect(await User.findById(user._id)).not.toBeNull();
    expect(await Product.findById(existingProduct._id)).not.toBeNull();
    expect(await Product.countDocuments({ userId: user._id })).toBe(13);
    expect(await Sale.countDocuments()).toBe(run.counts.sales);
  });
});
