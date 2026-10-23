const request = require('supertest');
const { createApp } = require('../src/app');
const { Product } = require('../src/models/Product');
const { Sale } = require('../src/models/Sale');
const { startMemoryDb, stopMemoryDb, clearCollections } = require('./helpers/memoryDb');

const app = createApp();
const userDetails = {
  name: 'Asha Verma',
  email: 'asha@example.com',
  password: 'securePass1',
  shopName: 'Asha Mart',
  shopAddress: '12 Market Road',
};

async function register(overrides = {}) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ ...userDetails, ...overrides });
  expect(response.status).toBe(201);
  return response.body.data.token;
}

async function createProduct(token, overrides = {}) {
  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Rice',
      sku: 'RICE-001',
      category: 'groceries',
      costPrice: 10.25,
      sellingPrice: 15.5,
      stockQuantity: 20,
      minStockThreshold: 5,
      ...overrides,
    });
  return response;
}

async function createSale(token, productId, overrides = {}) {
  return request(app)
    .post('/api/sales')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ productId, quantity: 2 }],
      ...overrides,
    });
}

describe('Core business API', () => {
  beforeAll(async () => {
    await startMemoryDb();
  });

  afterAll(async () => {
    await stopMemoryDb();
  });

  afterEach(async () => {
    await clearCollections();
  });

  test('protects products, sales, and analytics routes', async () => {
    const responses = await Promise.all([
      request(app).get('/api/products'),
      request(app).get('/api/sales'),
      request(app).get('/api/analytics/dashboard'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401]);
  });

  test('creates, lists, updates, and archives products within the owning account', async () => {
    const token = await register();
    const otherToken = await register({
      name: 'Other User',
      email: 'other@example.com',
      shopName: 'Other Shop',
    });
    const created = await createProduct(token);

    expect(created.status).toBe(201);
    expect(created.body.data.product).toMatchObject({
      name: 'Rice',
      sku: 'RICE-001',
      stockQuantity: 20,
      inventoryValue: 205,
      potentialProfit: 105,
    });

    const productId = created.body.data.product.id;
    const list = await request(app)
      .get('/api/products?search=rice')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.pagination.total).toBe(1);

    const hiddenFromOtherUser = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(hiddenFromOtherUser.status).toBe(404);

    const updated = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stockQuantity: 3, minStockThreshold: 4 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.product.isLowStock).toBe(true);

    const deleted = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
  });

  test('enforces unique SKUs per user and rejects empty product updates', async () => {
    const token = await register();
    await createProduct(token);

    const duplicate = await createProduct(token, { name: 'Brown Rice' });
    expect(duplicate.status).toBe(409);

    const product = await Product.findOne({ sku: 'RICE-001' });
    const emptyUpdate = await request(app)
      .patch(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(emptyUpdate.status).toBe(400);
  });

  test('records server-priced sales, prevents overselling, and handles retries idempotently', async () => {
    const token = await register();
    const created = await createProduct(token);
    const productId = created.body.data.product.id;

    const sale = await createSale(token, productId, {
      items: [{ productId, quantity: 3, sellingPrice: 0.01, costPrice: 0 }],
      paymentMethod: 'upi',
      clientRequestId: 'sale-request-001',
    });
    expect(sale.status).toBe(201);
    expect(sale.body.data.sale).toMatchObject({
      subtotal: 46.5,
      total: 46.5,
      cogs: 30.75,
      grossProfit: 15.75,
      paymentMethod: 'upi',
    });
    expect(sale.body.data.sale.items[0]).toMatchObject({
      quantity: 3,
      sellingPrice: 15.5,
      costPrice: 10.25,
      lineTotal: 46.5,
      lineCogs: 30.75,
    });

    const retry = await createSale(token, productId, {
      items: [{ productId, quantity: 1 }],
      clientRequestId: 'sale-request-001',
    });
    expect(retry.status).toBe(201);
    expect(retry.body.data.sale.id).toBe(sale.body.data.sale.id);

    const afterRetry = await Product.findById(productId);
    expect(afterRetry.stockQuantity).toBe(17);

    const insufficient = await createSale(token, productId, {
      items: [{ productId, quantity: 18 }],
    });
    expect(insufficient.status).toBe(400);
    expect((await Product.findById(productId)).stockQuantity).toBe(17);

    const forgedTotal = await createSale(token, productId, {
      subtotal: 0,
      items: [{ productId, quantity: 1 }],
    });
    expect(forgedTotal.status).toBe(400);
  });

  test('rejects duplicate sale items, inactive products, and cross-account product IDs', async () => {
    const token = await register();
    const otherToken = await register({
      name: 'Other User',
      email: 'other@example.com',
      shopName: 'Other Shop',
    });
    const ownedProduct = await createProduct(token);
    const foreignProduct = await createProduct(otherToken, { sku: 'FOREIGN-01' });

    const foreignSale = await createSale(token, foreignProduct.body.data.product.id);
    expect(foreignSale.status).toBe(404);

    const duplicateItems = await createSale(token, ownedProduct.body.data.product.id, {
      items: [
        { productId: ownedProduct.body.data.product.id, quantity: 1 },
        { productId: ownedProduct.body.data.product.id, quantity: 1 },
      ],
    });
    expect(duplicateItems.status).toBe(400);

    await Product.findByIdAndUpdate(ownedProduct.body.data.product.id, { isActive: false });
    const inactiveSale = await createSale(token, ownedProduct.body.data.product.id);
    expect(inactiveSale.status).toBe(400);
  });

  test('restores prior item deductions when a later sale item has insufficient stock', async () => {
    const token = await register();
    const first = await createProduct(token, { stockQuantity: 5 });
    const second = await createProduct(token, {
      name: 'Tea',
      sku: 'TEA-001',
      category: 'beverages',
      stockQuantity: 1,
    });

    const failedSale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: first.body.data.product.id, quantity: 2 },
          { productId: second.body.data.product.id, quantity: 2 },
        ],
      });

    expect(failedSale.status).toBe(400);
    expect((await Product.findById(first.body.data.product.id)).stockQuantity).toBe(5);
    expect((await Product.findById(second.body.data.product.id)).stockQuantity).toBe(1);
    expect(await Sale.countDocuments()).toBe(0);
  });

  test('archives products referenced by sales instead of deleting transaction history', async () => {
    const token = await register();
    const product = await createProduct(token);
    const productId = product.body.data.product.id;
    const sale = await createSale(token, productId);
    expect(sale.status).toBe(201);

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.archived).toBe(true);
    expect(response.body.data.deleted).toBe(false);
    expect((await Product.findById(productId)).isActive).toBe(false);
    expect(await Sale.countDocuments({ 'items.productId': productId })).toBe(1);
  });

  test('cancels a sale once, restores stock, and excludes cancelled sales from analytics', async () => {
    const token = await register();
    const product = await createProduct(token, { stockQuantity: 10, minStockThreshold: 3 });
    const productId = product.body.data.product.id;
    const sale = await createSale(token, productId, {
      items: [{ productId, quantity: 4 }],
    });
    const saleId = sale.body.data.sale.id;

    expect((await Product.findById(productId)).stockQuantity).toBe(6);

    const cancelled = await request(app)
      .post(`/api/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Customer returned items' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.sale.status).toBe('cancelled');
    expect(cancelled.body.data.sale.cancelReason).toBe('Customer returned items');
    expect((await Product.findById(productId)).stockQuantity).toBe(10);
  });

  test('restores stock once on cancellation races and excludes cancelled sales from analytics', async () => {
    const token = await register();
    const product = await createProduct(token, { stockQuantity: 10 });
    const productId = product.body.data.product.id;
    const sale = await createSale(token, productId, {
      items: [{ productId, quantity: 4 }],
    });
    const saleId = sale.body.data.sale.id;

    const responses = await Promise.all([
      request(app)
        .post(`/api/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({}),
      request(app)
        .post(`/api/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({}),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect((await Product.findById(productId)).stockQuantity).toBe(10);
    expect((await Sale.findById(saleId)).stockRestored).toBe(true);

    const repeated = await request(app)
      .post(`/api/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(repeated.status).toBe(400);
    expect((await Product.findById(productId)).stockQuantity).toBe(10);

    const dashboard = await request(app)
      .get('/api/analytics/dashboard?preset=day')
      .set('Authorization', `Bearer ${token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.dashboard.metrics).toMatchObject({
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      orderCount: 0,
      unitsSold: 0,
    });
    expect(dashboard.body.data.dashboard.empty).toBe(true);
  });

  test('aggregates completed sales into date-filtered dashboard metrics and trends', async () => {
    const token = await register();
    const otherToken = await register({
      name: 'Other User',
      email: 'other@example.com',
      shopName: 'Other Shop',
    });
    const product = await createProduct(token, { stockQuantity: 12, minStockThreshold: 10 });
    const productId = product.body.data.product.id;
    const otherProduct = await createProduct(otherToken, { sku: 'OTHER-01' });
    const today = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const todaySale = await createSale(token, productId, {
      items: [{ productId, quantity: 2 }],
      soldAt: `${today}T00:00:00.000Z`,
    });
    expect(todaySale.status).toBe(201);
    const yesterdaySale = await createSale(token, productId, {
      items: [{ productId, quantity: 1 }],
      soldAt: `${yesterday}T12:00:00.000Z`,
    });
    expect(yesterdaySale.status).toBe(201);
    await createSale(otherToken, otherProduct.body.data.product.id, {
      items: [{ productId: otherProduct.body.data.product.id, quantity: 5 }],
      soldAt: `${today}T12:00:00.000Z`,
    });

    const dashboard = await request(app)
      .get(`/api/analytics/dashboard?preset=custom&from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.dashboard.metrics).toMatchObject({
      revenue: 31,
      cogs: 20.5,
      grossProfit: 10.5,
      orderCount: 1,
      unitsSold: 2,
    });
    expect(dashboard.body.data.dashboard.dailyTrend).toHaveLength(1);
    expect(dashboard.body.data.dashboard.bestSelling[0].unitsSold).toBe(2);
    expect(dashboard.body.data.dashboard.lowStock).toHaveLength(1);
    expect(dashboard.body.data.dashboard.recentSales).toHaveLength(1);
    expect(dashboard.body.data.dashboard.definitions.netProfit).toMatch(/not calculated/i);

    const allSales = await request(app)
      .get(`/api/sales?from=${yesterday}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);
    expect(allSales.status).toBe(200);
    expect(allSales.body.data.pagination.total).toBe(2);

    const invalidRange = await request(app)
      .get('/api/analytics/dashboard?preset=custom&from=2026-02-31&to=2026-03-01')
      .set('Authorization', `Bearer ${token}`);
    expect(invalidRange.status).toBe(400);

    const storedSales = await Sale.find({ userId: (await Product.findById(productId)).userId });
    expect(storedSales).toHaveLength(2);
  });
});
