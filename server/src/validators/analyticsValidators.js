const { query } = require('express-validator');

const analyticsValidators = [
  query('preset').optional().isIn(['day', 'week', 'month', 'custom']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

module.exports = { analyticsValidators };
