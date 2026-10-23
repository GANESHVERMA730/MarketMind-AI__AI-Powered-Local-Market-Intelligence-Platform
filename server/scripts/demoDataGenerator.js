const crypto = require('crypto');
const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES } = require('../src/constants/products');
const { PAYMENT_METHODS, SALE_STATUSES } = require('../src/constants/sales');
const { toMoney } = require('../src/utils/money');

const DEFAULT_SHOP_COUNT = 10;
const DEFAULT_PRODUCTS_PER_SHOP = 40;
const DEFAULT_HISTORY_DAYS = 270;
const MIN_HISTORY_DAYS = 180;
const MAX_HISTORY_DAYS = 365;

const CITIES = [
  'Ahmedabad',
  'Bengaluru',
  'Chennai',
  'Guwahati',
  'Indore',
  'Jaipur',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Pune',
];

const CATALOG = [
  { category: 'groceries', names: ['Basmati Rice 1 kg', 'Whole Wheat Flour 5 kg', 'Toor Dal 1 kg', 'Sunflower Oil 1 L', 'Sugar 1 kg', 'Tea Leaves 250 g', 'Salt 1 kg', 'Cooking Spices Pack'], cost: [18, 240] },
  { category: 'beverages', names: ['Mineral Water 1 L', 'Orange Juice 1 L', 'Ground Coffee 200 g', 'Green Tea 25 bags', 'Mango Drink 600 ml', 'Milk 1 L', 'Lemon Soda 600 ml'], cost: [12, 180] },
  { category: 'snacks', names: ['Potato Crisps 100 g', 'Roasted Peanuts 200 g', 'Chocolate Bar 50 g', 'Oat Biscuits 300 g', 'Corn Puffs 80 g', 'Trail Mix 150 g', 'Crispy Namkeen 200 g'], cost: [8, 100] },
  { category: 'personal_care', names: ['Herbal Soap 100 g', 'Shampoo 180 ml', 'Toothpaste 150 g', 'Hand Wash 250 ml', 'Face Cream 50 g', 'Hair Oil 200 ml'], cost: [20, 300] },
  { category: 'household', names: ['Laundry Detergent 1 kg', 'Dish Soap 500 ml', 'Floor Cleaner 1 L', 'Paper Towels 2 pack', 'LED Bulb 9 W', 'Storage Container 1 pc', 'Garbage Bags 20 pack'], cost: [18, 450] },
  { category: 'other', names: ['Notebook 160 pages', 'Ballpoint Pen 5 pack', 'Reusable Shopping Bag', 'AA Batteries 2 pack', 'Adhesive Tape 1 pc'], cost: [10, 250] },
];

const MARKET_SHOPS = [
  { name: 'Synthetic Corner Store 01', city: 'Ahmedabad' },
  { name: 'Synthetic Corner Store 02', city: 'Bengaluru' },
  { name: 'Synthetic Corner Store 03', city: 'Chennai' },
  { name: 'Synthetic Corner Store 04', city: 'Guwahati' },
  { name: 'Synthetic Corner Store 05', city: 'Indore' },
  { name: 'Synthetic Corner Store 06', city: 'Jaipur' },
  { name: 'Synthetic Corner Store 07', city: 'Kochi' },
  { name: 'Synthetic Corner Store 08', city: 'Kolkata' },
  { name: 'Synthetic Corner Store 09', city: 'Lucknow' },
  { name: 'Synthetic Corner Store 10', city: 'Pune' },
];

function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function stableObjectId(namespace) {
  const hex = crypto.createHash('sha256').update(namespace).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
}

function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function parseDay(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    throw new Error(`${label} must be a valid YYYY-MM-DD date`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || isoDay(date) !== value) {
    throw new Error(`${label} must be a valid YYYY-MM-DD date`);
  }
  return date;
}

function makeCatalog(productsPerShop) {
  const products = [];
  let index = 0;
  while (products.length < productsPerShop) {
    const category = CATALOG[index % CATALOG.length];
    const categoryIndex = Math.floor(index / CATALOG.length);
    const name = category.names[categoryIndex % category.names.length];
    products.push({
      name,
      category: category.category,
      costRange: category.cost,
      categoryIndex,
      index,
    });
    index += 1;
  }
  return products;
}

function getSeasonFactor(category, date) {
  const month = date.getUTCMonth();
  const day = date.getUTCDay();
  let factor = day === 0 || day === 6 ? 1.35 : 1;

  if (category === 'beverages' && [3, 4, 5].includes(month)) factor *= 1.35;
  if (category === 'groceries' && [9, 10].includes(month)) factor *= 1.3;
  if (category === 'household' && [6, 7].includes(month)) factor *= 1.2;
  if (category === 'snacks' && day === 0) factor *= 1.15;
  return factor;
}

function getDemandClass(index) {
  if (index % 5 === 0) return 'slow';
  if (index % 3 === 0) return 'steady';
  return 'regular';
}

function selectProducts(random, products, weights, count) {
  const selected = [];
  const available = products.map((product, index) => ({ product, weight: weights[index] }));
  while (selected.length < count && available.length) {
    const weightTotal = available.reduce((sum, item) => sum + item.weight, 0);
    let target = random() * weightTotal;
    let selectedIndex = available.length - 1;
    for (let index = 0; index < available.length; index += 1) {
      target -= available[index].weight;
      if (target <= 0) {
        selectedIndex = index;
        break;
      }
    }
    selected.push(available[selectedIndex].product);
    available.splice(selectedIndex, 1);
  }
  return selected;
}

function buildShopProducts({ random, seed, runKey, shopId, userId, catalog, productsPerShop }) {
  return catalog.slice(0, productsPerShop).map((item, index) => {
    const cost = toMoney(randomInt(random, item.costRange[0], item.costRange[1]) + random() * 0.99);
    const margin = 1.16 + random() * 0.37;
    const threshold = randomInt(random, 5, 10);
    const demandClass = getDemandClass(index);
    return {
      _id: stableObjectId(`${runKey}:${shopId}:product:${index}`),
      userId,
      name: item.name,
      sku: `${shopId.toUpperCase()}-${item.category.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
      category: item.category,
      description: `Synthetic demo item · ${item.name}`,
      costPrice: cost,
      sellingPrice: toMoney(cost * margin),
      stockQuantity: 0,
      minStockThreshold: threshold,
      supplierName: `Demo Supplier ${String((index % 8) + 1).padStart(2, '0')}`,
      isActive: true,
      demandClass,
      isTargetLowStock: index % 10 === 0,
      _seedIndex: index,
      _shopId: shopId,
      _seed: seed,
    };
  });
}

function buildShopSales({ random, seed, runKey, shop, products, dates }) {
  const soldByProduct = new Map(products.map((product) => [String(product._id), 0]));
  const sales = [];

  dates.forEach((day, dayIndex) => {
    const weekday = day.getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const orderCount = 1 + (random() < (weekend ? 0.62 : 0.2) ? 1 : 0);

    for (let orderIndex = 0; orderIndex < orderCount; orderIndex += 1) {
      const lineCount = Math.min(products.length, randomInt(random, 1, 3) + (weekend && random() < 0.35 ? 1 : 0));
      const weights = products.map((product) => {
        const classWeight = product.demandClass === 'slow' ? 0.12 : product.demandClass === 'steady' ? 0.85 : 2.8;
        return classWeight * getSeasonFactor(product.category, day);
      });
      const selected = selectProducts(random, products, weights, lineCount);
      const items = selected.map((product) => {
        const quantity = randomInt(random, 1, weekend ? 4 : 3);
        soldByProduct.set(String(product._id), soldByProduct.get(String(product._id)) + quantity);
        const lineTotal = toMoney(product.sellingPrice * quantity);
        const lineCogs = toMoney(product.costPrice * quantity);
        return {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          category: product.category,
          quantity,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          lineTotal,
          lineCogs,
        };
      });
      const subtotal = toMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
      const cogs = toMoney(items.reduce((sum, item) => sum + item.lineCogs, 0));
      const soldAt = new Date(day);
      soldAt.setUTCHours(randomInt(random, 8, 20), randomInt(random, 0, 59), 0, 0);
      const dayStamp = isoDay(day).replaceAll('-', '');
      const clientRequestId = `seed-${seed}-${shop.shopId}-${dayStamp}-${orderIndex + 1}`;
      sales.push({
        _id: stableObjectId(`${runKey}:${shop.shopId}:sale:${dayIndex}:${orderIndex}`),
        userId: shop.userId,
        soldAt,
        items,
        subtotal,
        total: subtotal,
        cogs,
        grossProfit: toMoney(subtotal - cogs),
        paymentMethod: pick(random, PAYMENT_METHODS),
        status: SALE_STATUSES.COMPLETED,
        clientRequestId,
        stockRestored: false,
      });
    }
  });

  return { sales, soldByProduct };
}

function buildMarketPrices({ random, seed, runKey, catalog, observedAt }) {
  return MARKET_SHOPS.map((shop, shopIndex) => {
    const marketShopId = `market-${String(shopIndex + 1).padStart(2, '0')}`;
    return catalog.map((product, productIndex) => {
      const range = product.costRange;
      const costPrice = randomInt(random, range[0], range[1]);
      const sellingPrice = toMoney(costPrice * (1.17 + random() * 0.4));
      return {
        _id: stableObjectId(`${runKey}:${marketShopId}:market:${productIndex}`),
        seedRunKey: runKey,
        marketShopId,
        marketShopName: shop.name,
        city: shop.city,
        productName: product.name,
        category: product.category,
        sellingPrice,
        observedAt,
        sourceLabel: 'synthetic-demo',
      };
    });
  }).flat();
}

function createDemoPlan(options = {}) {
  const seed = options.seed ?? 42;
  const shopCount = options.shopCount ?? DEFAULT_SHOP_COUNT;
  const productsPerShop = options.productsPerShop ?? DEFAULT_PRODUCTS_PER_SHOP;
  const historyDays = options.historyDays ?? DEFAULT_HISTORY_DAYS;

  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('seed must be a non-negative safe integer');
  if (!Number.isInteger(shopCount) || shopCount < 1 || shopCount > 12) {
    throw new Error('shopCount must be between 1 and 12');
  }
  if (!Number.isInteger(productsPerShop) || productsPerShop < 1 || productsPerShop > 50) {
    throw new Error('productsPerShop must be between 1 and 50');
  }
  if (!Number.isInteger(historyDays) || historyDays < MIN_HISTORY_DAYS || historyDays > MAX_HISTORY_DAYS) {
    throw new Error(`historyDays must be between ${MIN_HISTORY_DAYS} and ${MAX_HISTORY_DAYS}`);
  }

  const endDate = options.endDate
    ? parseDay(options.endDate, 'endDate')
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 1));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (endDate >= today) throw new Error('endDate must be before today to avoid future or partial-day sales');

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - historyDays + 1);
  const dates = Array.from({ length: historyDays }, (_, index) => {
    const day = new Date(startDate);
    day.setUTCDate(day.getUTCDate() + index);
    return day;
  });
  const runKey = `marketmind-demo-v1-${seed}`;
  const random = createRandom(seed);
  const catalog = makeCatalog(productsPerShop);
  const shops = [];
  const users = [];
  const products = [];
  const sales = [];
  const productRecords = [];

  for (let shopIndex = 0; shopIndex < shopCount; shopIndex += 1) {
    const shopId = `shop-${String(shopIndex + 1).padStart(2, '0')}`;
    const userId = options.attachedUserId
      ? (shopIndex === 0 ? new mongoose.Types.ObjectId(options.attachedUserId) : stableObjectId(`${runKey}:${shopId}:user`))
      : stableObjectId(`${runKey}:${shopId}:user`);
    const linkedToExistingAccount = Boolean(options.attachedUserId && shopIndex === 0);

    shops.push({ shopId, userId, linkedToExistingAccount });
    if (!linkedToExistingAccount) {
      users.push({
        _id: userId,
        name: `Synthetic Demo Owner ${String(shopIndex + 1).padStart(2, '0')}`,
        email: `marketmind-demo-${seed}-${String(shopIndex + 1).padStart(2, '0')}@demo.invalid`,
        shopName: `MarketMind Demo Shop ${String(shopIndex + 1).padStart(2, '0')}`,
        shopAddress: `Synthetic market district, ${CITIES[shopIndex % CITIES.length]}`,
      });
    }

    const shopProducts = buildShopProducts({
      random,
      seed,
      runKey,
      shopId,
      userId,
      catalog,
      productsPerShop,
    });
    const shop = shops[shopIndex];
    const shopHistory = buildShopSales({ random, seed, runKey, shop, products: shopProducts, dates });
    shopProducts.forEach((product) => {
      const soldUnits = shopHistory.soldByProduct.get(String(product._id));
      const endingStock = product.isTargetLowStock ? randomInt(random, 0, Math.min(4, product.minStockThreshold - 1)) : randomInt(random, 12, 60);
      const openingStock = soldUnits + endingStock;
      product.stockQuantity = endingStock;
      productRecords.push({
        productId: product._id,
        userId,
        shopId,
        openingStock,
        endingStock,
        soldUnits,
      });
      delete product.demandClass;
      delete product.isTargetLowStock;
      delete product._seedIndex;
      delete product._shopId;
      delete product._seed;
    });
    products.push(...shopProducts);
    sales.push(...shopHistory.sales);
  }

  const marketPrices = buildMarketPrices({
    random,
    seed,
    runKey,
    catalog,
    observedAt: endDate,
  });

  return {
    seed,
    runKey,
    historyStart: startDate,
    historyEnd: endDate,
    shops,
    users,
    products,
    sales,
    marketPrices,
    productRecords,
  };
}

module.exports = {
  DEFAULT_SHOP_COUNT,
  DEFAULT_PRODUCTS_PER_SHOP,
  DEFAULT_HISTORY_DAYS,
  createDemoPlan,
  getSeasonFactor,
};
