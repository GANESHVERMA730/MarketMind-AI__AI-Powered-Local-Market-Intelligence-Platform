const { asyncHandler } = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await analyticsService.getDashboard(req.user._id, req.query);
  res.status(200).json({
    success: true,
    data: { dashboard },
  });
});

module.exports = { getDashboard };
