const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES } = require('../constants/products');

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [120, 'Product name must be at most 120 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      maxlength: [40, 'SKU must be at most 40 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: PRODUCT_CATEGORIES,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
      default: '',
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock quantity must be a whole number',
      },
    },
    minStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Minimum stock threshold cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Minimum stock threshold must be a whole number',
      },
    },
    supplierName: {
      type: String,
      trim: true,
      maxlength: [120, 'Supplier name must be at most 120 characters'],
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, sku: 1 }, { unique: true });
productSchema.index({ userId: 1, category: 1 });
productSchema.index({ userId: 1, name: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = { Product };
