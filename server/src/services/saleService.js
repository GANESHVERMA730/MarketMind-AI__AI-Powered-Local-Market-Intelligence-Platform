const mongoose = require('mongoose');
const { Product } = require('../models/Product');
const { Sale } = require('../models/Sale');
const { SALE_STATUSES } = require('../constants/sales');
const { ApiError } = require('../utils/ApiError');
const { toMoney } = require('../utils/money');
const { paginate, paginationMeta } = require('../utils/pagination');
const { resolveDateRange } = require('../utils/dateRange');
const { toPublicSale } = require('../utils/saleResponse');
const { runWithOptionalTransaction } = require('./dbSession');

function sessionOpts(session) {
  return session ? { session } : {};
}

function buildLineItems(productsById, requestedItems) {
  return requestedItems.map((item) => {
    const product = productsById.get(String(item.productId));
    if (!product) {
      throw new ApiError(404, 'One or more products were not found');
    }
    if (!product.isActive) {
      throw new ApiError(400, `${product.name} is archived and cannot be sold`);
    }

    const quantity = item.quantity;
    const sellingPrice = toMoney(product.sellingPrice);
    const costPrice = toMoney(product.costPrice);
    return {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      quantity,
      sellingPrice,
      costPrice,
      lineTotal: toMoney(quantity * sellingPrice),
      lineCogs: toMoney(quantity * costPrice),
    };
  });
}

async function findExistingSale(userId, clientRequestId, session) {
  if (!clientRequestId) {
    return null;
  }
  return Sale.findOne({ userId, clientRequestId }, null, sessionOpts(session));
}

async function loadOwnedProducts(userId, items, session) {
  const ids = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: ids }, userId }, null, sessionOpts(session));
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  return productsById;
}

async function deductStock(userId, lineItems, session) {
  const deducted = [];

  for (const item of lineItems) {
    const updated = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        userId,
        isActive: true,
        stockQuantity: { $gte: item.quantity },
      },
      { $inc: { stockQuantity: -item.quantity } },
      { new: true, ...sessionOpts(session) }
    );

    if (!updated) {
      if (!session) {
        await restoreStock(userId, deducted, null);
      }
      throw new ApiError(400, 'Insufficient stock for one or more products', [
        { field: 'items', message: `Not enough stock for ${item.productName}` },
      ]);
    }

    deducted.push({ productId: item.productId, quantity: item.quantity });
  }

  return deducted;
}

async function restoreStock(userId, deducted, session) {
  for (const item of deducted) {
    await Product.updateOne(
      { _id: item.productId, userId },
      { $inc: { stockQuantity: item.quantity } },
      sessionOpts(session)
    );
  }
}

async function createSale(userId, payload) {
  const existing = await findExistingSale(userId, payload.clientRequestId);
  if (existing) {
    return toPublicSale(existing);
  }

  const requestedItems = payload.items;
  const seen = new Set();
  requestedItems.forEach((item) => {
    const key = String(item.productId);
    if (seen.has(key)) {
      throw new ApiError(400, 'Duplicate products in a sale are not allowed. Combine quantities instead.');
    }
    seen.add(key);
  });

  try {
    const sale = await runWithOptionalTransaction(async (session) => {
      const again = await findExistingSale(userId, payload.clientRequestId, session);
      if (again) {
        return again;
      }

      const productsById = await loadOwnedProducts(userId, requestedItems, session);
      if (productsById.size !== requestedItems.length) {
        throw new ApiError(404, 'One or more products were not found');
      }

      const lineItems = buildLineItems(productsById, requestedItems);
      const deducted = await deductStock(userId, lineItems, session);

      const subtotal = toMoney(lineItems.reduce((sum, item) => sum + item.lineTotal, 0));
      const cogs = toMoney(lineItems.reduce((sum, item) => sum + item.lineCogs, 0));
      const soldAt = payload.soldAt ? new Date(payload.soldAt) : new Date();

      const saleDoc = {
        userId,
        soldAt,
        items: lineItems,
        subtotal,
        total: subtotal,
        cogs,
        grossProfit: toMoney(subtotal - cogs),
        paymentMethod: payload.paymentMethod || 'cash',
        status: SALE_STATUSES.COMPLETED,
        clientRequestId: payload.clientRequestId || undefined,
      };

      try {
        if (session) {
          const created = await Sale.create([saleDoc], { session });
          return created[0];
        }
        return Sale.create(saleDoc);
      } catch (err) {
        if (!session) {
          await restoreStock(userId, deducted, null);
        }
        throw err;
      }
    });

    return toPublicSale(sale);
  } catch (err) {
    if (err.code === 11000 && payload.clientRequestId) {
      const duplicate = await findExistingSale(userId, payload.clientRequestId);
      if (duplicate) {
        return toPublicSale(duplicate);
      }
    }
    throw err;
  }
}

async function listSales(userId, query) {
  const { page, limit, skip } = paginate(query);
  const filter = { userId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.preset || query.from || query.to) {
    const range = resolveDateRange(query);
    filter.soldAt = { $gte: range.from, $lt: range.to };
  }

  const [items, total] = await Promise.all([
    Sale.find(filter).sort({ soldAt: -1, _id: -1 }).skip(skip).limit(limit),
    Sale.countDocuments(filter),
  ]);

  return {
    items: items.map(toPublicSale),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function getSale(userId, saleId) {
  const sale = await Sale.findOne({ _id: saleId, userId });
  if (!sale) {
    throw new ApiError(404, 'Sale not found');
  }
  return toPublicSale(sale);
}

async function cancelSale(userId, saleId, reason) {
  const cancelled = await runWithOptionalTransaction(async (session) => {
    const sale = await Sale.findOne({ _id: saleId, userId }, null, sessionOpts(session));
    if (!sale) {
      throw new ApiError(404, 'Sale not found');
    }
    if (sale.status !== SALE_STATUSES.COMPLETED || sale.stockRestored) {
      throw new ApiError(400, 'Sale is already cancelled');
    }

    const restoreItems = sale.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    await restoreStock(userId, restoreItems, session);

    const updated = await Sale.findOneAndUpdate(
      {
        _id: sale._id,
        userId,
        status: SALE_STATUSES.COMPLETED,
        stockRestored: false,
      },
      {
        $set: {
          status: SALE_STATUSES.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason || 'Cancelled by user',
          stockRestored: true,
        },
      },
      { new: true, ...sessionOpts(session) }
    );

    if (!updated) {
      if (!session) {
        await deductStock(userId, sale.items, null);
      }
      throw new ApiError(400, 'Sale is already cancelled');
    }

    return updated;
  });

  return toPublicSale(cancelled);
}

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = {
  createSale,
  listSales,
  getSale,
  cancelSale,
  isObjectId,
};
