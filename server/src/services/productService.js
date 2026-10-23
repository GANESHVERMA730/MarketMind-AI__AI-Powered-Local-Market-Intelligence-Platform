const { Product } = require('../models/Product');
const { Sale } = require('../models/Sale');
const { PRODUCT_SORT_FIELDS } = require('../constants/products');
const { ApiError } = require('../utils/ApiError');
const { paginate, paginationMeta } = require('../utils/pagination');
const { toPublicProduct } = require('../utils/productResponse');
const { toMoney } = require('../utils/money');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createProduct(userId, payload) {
  try {
    const product = await Product.create({
      userId,
      name: payload.name,
      sku: payload.sku,
      category: payload.category,
      description: payload.description || '',
      costPrice: toMoney(payload.costPrice),
      sellingPrice: toMoney(payload.sellingPrice),
      stockQuantity: payload.stockQuantity,
      minStockThreshold: payload.minStockThreshold ?? 5,
      supplierName: payload.supplierName || '',
    });
    return toPublicProduct(product);
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'A product with this SKU already exists');
    }
    throw err;
  }
}

async function listProducts(userId, query) {
  const { page, limit, skip } = paginate(query);
  const filter = { userId };

  if (query.includeArchived !== 'true') {
    filter.isActive = true;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { sku: pattern }];
  }

  if (query.lowStock === 'true') {
    filter.$expr = { $lte: ['$stockQuantity', '$minStockThreshold'] };
  }

  const sortField = PRODUCT_SORT_FIELDS.includes(query.sort) ? query.sort : 'createdAt';
  const sortDir = query.order === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sortField]: sortDir, _id: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items: items.map(toPublicProduct),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function getProduct(userId, productId) {
  const product = await Product.findOne({ _id: productId, userId });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  return toPublicProduct(product);
}

async function updateProduct(userId, productId, payload) {
  const product = await Product.findOne({ _id: productId, userId });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const allowed = [
    'name',
    'sku',
    'category',
    'description',
    'costPrice',
    'sellingPrice',
    'stockQuantity',
    'minStockThreshold',
    'supplierName',
    'isActive',
  ];

  allowed.forEach((field) => {
    if (payload[field] !== undefined) {
      product[field] =
        field === 'costPrice' || field === 'sellingPrice' ? toMoney(payload[field]) : payload[field];
    }
  });

  try {
    await product.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'A product with this SKU already exists');
    }
    throw err;
  }

  return toPublicProduct(product);
}

async function deleteProduct(userId, productId) {
  const product = await Product.findOne({ _id: productId, userId });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const linkedSale = await Sale.exists({ userId, 'items.productId': product._id });
  if (linkedSale) {
    product.isActive = false;
    await product.save();
    return {
      archived: true,
      deleted: false,
      product: toPublicProduct(product),
      message:
        'Product is linked to sales history, so it was archived instead of deleted. Past transactions are unchanged.',
    };
  }

  await product.deleteOne();
  return {
    archived: false,
    deleted: true,
    product: toPublicProduct(product),
    message: 'Product deleted',
  };
}

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
