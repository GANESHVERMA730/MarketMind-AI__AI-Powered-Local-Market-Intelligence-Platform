const { asyncHandler } = require('../utils/asyncHandler');
const saleService = require('../services/saleService');

const createSale = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale(req.user._id, req.body);
  res.status(201).json({
    success: true,
    message: 'Sale recorded',
    data: { sale },
  });
});

const listSales = asyncHandler(async (req, res) => {
  const result = await saleService.listSales(req.user._id, req.query);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getSale = asyncHandler(async (req, res) => {
  const sale = await saleService.getSale(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: { sale },
  });
});

const cancelSale = asyncHandler(async (req, res) => {
  const sale = await saleService.cancelSale(req.user._id, req.params.id, req.body.reason);
  res.status(200).json({
    success: true,
    message: 'Sale cancelled and stock restored',
    data: { sale },
  });
});

module.exports = {
  createSale,
  listSales,
  getSale,
  cancelSale,
};
