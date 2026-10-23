const { toMoney } = require('./money');

function toPublicProduct(product) {
  const stockQuantity = product.stockQuantity;
  const costPrice = toMoney(product.costPrice);
  const sellingPrice = toMoney(product.sellingPrice);

  return {
    id: String(product._id),
    name: product.name,
    sku: product.sku,
    category: product.category,
    description: product.description || '',
    costPrice,
    sellingPrice,
    stockQuantity,
    minStockThreshold: product.minStockThreshold,
    supplierName: product.supplierName || '',
    isActive: product.isActive,
    isLowStock: stockQuantity <= product.minStockThreshold,
    inventoryValue: toMoney(stockQuantity * costPrice),
    potentialProfit: toMoney(stockQuantity * (sellingPrice - costPrice)),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

module.exports = { toPublicProduct };
