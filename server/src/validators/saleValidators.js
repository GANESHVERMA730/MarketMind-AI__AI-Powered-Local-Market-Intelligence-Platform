const { body, param, query } = require('express-validator');
const { PAYMENT_METHODS, SALE_STATUSES } = require('../constants/sales');

const saleIdParam = [param('id').isMongoId().withMessage('Invalid sale id')];

const createSaleValidators = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  body('items.*.productId').isMongoId().withMessage('Each item needs a valid productId'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each quantity must be a whole number of at least 1'),
  body('subtotal').optional().custom(() => {
    throw new Error('Totals are calculated on the server and must not be sent');
  }),
  body('total').optional().custom(() => {
    throw new Error('Totals are calculated on the server and must not be sent');
  }),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS),
  body('clientRequestId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 8, max: 64 })
    .withMessage('clientRequestId must be 8-64 characters'),
  body('soldAt')
    .optional()
    .isISO8601()
    .withMessage('soldAt must be a valid ISO date')
    .custom((value) => {
      if (new Date(value).getTime() > Date.now() + 60 * 1000) {
        throw new Error('soldAt cannot be in the future');
      }
      return true;
    }),
];

const listSaleValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(Object.values(SALE_STATUSES)),
  query('preset').optional().isIn(['day', 'week', 'month', 'custom']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

const cancelSaleValidators = [
  ...saleIdParam,
  body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
];

module.exports = {
  saleIdParam,
  createSaleValidators,
  listSaleValidators,
  cancelSaleValidators,
};
