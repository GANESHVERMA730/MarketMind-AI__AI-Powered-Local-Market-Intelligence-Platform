const mongoose = require('mongoose');

const productRecordSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    shopId: { type: String, required: true },
    openingStock: { type: Number, required: true, min: 0 },
    endingStock: { type: Number, required: true, min: 0 },
    soldUnits: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const demoSeedRunSchema = new mongoose.Schema(
  {
    seed: { type: Number, required: true, unique: true },
    runKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      required: true,
    },
    historyStart: { type: Date, required: true },
    historyEnd: { type: Date, required: true },
    shops: [
      {
        shopId: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        linkedToExistingAccount: { type: Boolean, required: true },
        _id: false,
      },
    ],
    generatedUserIds: [{ type: mongoose.Schema.Types.ObjectId }],
    productRecords: { type: [productRecordSchema], default: [] },
    saleIds: [{ type: mongoose.Schema.Types.ObjectId }],
    productIds: [{ type: mongoose.Schema.Types.ObjectId }],
    marketPriceIds: [{ type: mongoose.Schema.Types.ObjectId }],
    counts: {
      shops: { type: Number, default: 0 },
      products: { type: Number, default: 0 },
      sales: { type: Number, default: 0 },
      marketPrices: { type: Number, default: 0 },
    },
  },
  { timestamps: true, collection: 'demo_seed_runs' }
);

const DemoSeedRun = mongoose.model('DemoSeedRun', demoSeedRunSchema);

module.exports = { DemoSeedRun };
