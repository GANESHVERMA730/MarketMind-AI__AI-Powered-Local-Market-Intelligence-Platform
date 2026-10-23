const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const saleController = require('../controllers/saleController');
const {
  createSaleValidators,
  listSaleValidators,
  saleIdParam,
  cancelSaleValidators,
} = require('../validators/saleValidators');

const saleRoutes = express.Router();

saleRoutes.use(requireAuth);

saleRoutes.get('/', listSaleValidators, validateRequest, saleController.listSales);
saleRoutes.post('/', createSaleValidators, validateRequest, saleController.createSale);
saleRoutes.get('/:id', saleIdParam, validateRequest, saleController.getSale);
saleRoutes.post('/:id/cancel', cancelSaleValidators, validateRequest, saleController.cancelSale);

module.exports = { saleRoutes };
