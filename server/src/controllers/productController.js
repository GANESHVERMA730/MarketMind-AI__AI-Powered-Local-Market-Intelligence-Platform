const { asyncHandler } = require('../utils/asyncHandler');
const productService = require('../services/productService');

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.user._id, req.body);
  res.status(201).json({
    success: true,
    message: 'Product created',
    data: { product },
  });
});

const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.user._id, req.query);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: { product },
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.user._id, req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Product updated',
    data: { product },
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
