const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const productController = require('../controllers/productController');
const {
  createProductValidators,
  updateProductValidators,
  listProductValidators,
  idParam,
} = require('../validators/productValidators');

const productRoutes = express.Router();

productRoutes.use(requireAuth);

productRoutes.get('/', listProductValidators, validateRequest, productController.listProducts);
productRoutes.post('/', createProductValidators, validateRequest, productController.createProduct);
productRoutes.get('/:id', idParam, validateRequest, productController.getProduct);
productRoutes.patch('/:id', updateProductValidators, validateRequest, productController.updateProduct);
productRoutes.delete('/:id', idParam, validateRequest, productController.deleteProduct);

module.exports = { productRoutes };
