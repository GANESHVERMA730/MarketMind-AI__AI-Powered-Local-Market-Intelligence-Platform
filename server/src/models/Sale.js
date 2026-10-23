const mongoose = require('mongoose');
const { PAYMENT_METHODS, SALE_STATUSES } = require('../constants/sales');

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    category: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    lineCogs: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    soldAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'A sale must contain at least one item',
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    cogs: { type: Number, required: true, min: 0 },
    grossProfit: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'cash',
    },
    status: {
      type: String,
      enum: Object.values(SALE_STATUSES),
      default: SALE_STATUSES.COMPLETED,
      index: true,
    },
    clientRequestId: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    cancelledAt: { type: Date },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    stockRestored: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

saleSchema.index({ userId: 1, soldAt: -1 });
saleSchema.index({ userId: 1, status: 1, soldAt: -1 });
saleSchema.index(
  { userId: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: 'string' } } }
);

const Sale = mongoose.model('Sale', saleSchema);

module.exports = { Sale };
