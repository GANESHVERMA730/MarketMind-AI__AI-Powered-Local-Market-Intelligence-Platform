const { toMoney } = require('./money');

function toPublicSale(sale) {
  return {
    id: String(sale._id),
    soldAt: sale.soldAt,
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    clientRequestId: sale.clientRequestId || null,
    items: sale.items.map((item) => ({
      productId: String(item.productId),
      productName: item.productName,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      sellingPrice: toMoney(item.sellingPrice),
      costPrice: toMoney(item.costPrice),
      lineTotal: toMoney(item.lineTotal),
      lineCogs: toMoney(item.lineCogs),
    })),
    subtotal: toMoney(sale.subtotal),
    total: toMoney(sale.total),
    cogs: toMoney(sale.cogs),
    grossProfit: toMoney(sale.grossProfit),
    cancelledAt: sale.cancelledAt || null,
    cancelReason: sale.cancelReason || '',
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}

module.exports = { toPublicSale };
