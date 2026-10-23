const { body, param, query } = require('express-validator');
const { PRODUCT_CATEGORIES, PRODUCT_SORT_FIELDS } = require('../constants/products');

const idParam = [param('id').isMongoId().withMessage('Invalid product id')];

const createProductValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters'),
  body('sku')
    .trim()
    .isLength({ min: 2, max: 40 })
    .withMessage('SKU must be 2-40 characters')
    .matches(/^[A-Za-z0-9-_]+$/)
    .withMessage('SKU may contain letters, numbers, hyphens, and underscores only'),
  body('category').isIn(PRODUCT_CATEGORIES).withMessage('Category is invalid'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price cannot be negative'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price cannot be negative'),
  body('stockQuantity').isInt({ min: 0 }).withMessage('Stock cannot be negative'),
  body('minStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock threshold cannot be negative'),
  body('supplierName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Supplier name must be at most 120 characters'),
];

const updateProductValidators = [
  ...idParam,
  body().custom((value) => {
    const allowedFields = [
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
    if (!value || !allowedFields.some((field) => value[field] !== undefined)) {
      throw new Error('At least one supported product field is required');
    }
    return true;
  }),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Name must be 2-120 characters'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 2, max: 40 })
    .matches(/^[A-Za-z0-9-_]+$/)
    .withMessage('SKU may contain letters, numbers, hyphens, and underscores only'),
  body('category').optional().isIn(PRODUCT_CATEGORIES).withMessage('Category is invalid'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price cannot be negative'),
  body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('Selling price cannot be negative'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock cannot be negative'),
  body('minStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock threshold cannot be negative'),
  body('supplierName').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const listProductValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(PRODUCT_SORT_FIELDS),
  query('order').optional().isIn(['asc', 'desc']),
  query('category').optional().isIn(PRODUCT_CATEGORIES),
  query('search').optional().trim().isLength({ max: 80 }),
  query('lowStock').optional().isIn(['true', 'false']),
  query('includeArchived').optional().isIn(['true', 'false']),
];

module.exports = {
  idParam,
  createProductValidators,
  updateProductValidators,
  listProductValidators,
};
