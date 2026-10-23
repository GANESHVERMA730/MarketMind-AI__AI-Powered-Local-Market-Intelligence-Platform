
const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const forecastRoutes = express.Router();

forecastRoutes.use(requireAuth);

forecastRoutes.get('/:productId', async (req, res, next) => {
  try {
    const response = await axios.post(
      `${process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'}/predict`,
      {
        product_id: req.params.productId,
        days: Math.min(Number(req.query.days) || 7, 30),
      },
      { timeout: 15000 }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data.detail || 'Forecast request failed',
      });
    }

    next(error);
  }
});

module.exports = { forecastRoutes };
