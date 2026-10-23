const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

function validateRequest(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((item) => ({
    field: item.path,
    message: item.msg,
  }));

  next(new ApiError(400, 'Validation failed', details));
}

module.exports = { validateRequest };
