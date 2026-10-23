const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES } = require('../constants/products');

const syntheticMarketPriceSchema = new mongoose.Schema(
  {
    seedRunKey: {
      type: String,
      required: true,
      index: true,
    },
    marketShopId: {
      type: String,
      required: true,
    },
    marketShopName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    city: {
      type: String,
      required: true,
      maxlength: 80,
    },
    productName: {
      type: String,
      required: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      enum: PRODUCT_CATEGORIES,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    observedAt: {
      type: Date,
      required: true,
    },
    sourceLabel: {
      type: String,
      required: true,
      enum: ['synthetic-demo'],
      default: 'synthetic-demo',
    },
  },
  { timestamps: true, collection: 'synthetic_market_prices' }
);

syntheticMarketPriceSchema.index({ category: 1, productName: 1 });
syntheticMarketPriceSchema.index({ seedRunKey: 1, marketShopId: 1 });

const SyntheticMarketPrice = mongoose.model('SyntheticMarketPrice', syntheticMarketPriceSchema);

module.exports = { SyntheticMarketPrice };
