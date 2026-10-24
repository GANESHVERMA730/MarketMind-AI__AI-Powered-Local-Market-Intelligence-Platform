const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const LOCAL_ML_SERVICE_URL = 'http://127.0.0.1:8000';
const forecastRoutes = express.Router();

function getPredictionUrl() {
  const configuredUrl = process.env.ML_SERVICE_URL?.trim();
  const isLocalEnvironment = ['development', 'test'].includes(process.env.NODE_ENV);

  if (!configuredUrl && !isLocalEnvironment) return null;

  const baseUrl = configuredUrl || LOCAL_ML_SERVICE_URL;

  try {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (
      !isLocalEnvironment &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase())
    ) {
      return null;
    }

    const basePath = url.pathname.replace(/\/+$/, '').replace(/\/predict$/i, '');
    url.pathname = `${basePath}/predict`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function errorDetail(error) {
  const detail = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : null;
}

forecastRoutes.use(requireAuth);

forecastRoutes.get('/:productId', async (req, res, next) => {
  const predictionUrl = getPredictionUrl();
  if (!predictionUrl) {
    console.error('[forecast] ML_SERVICE_URL is missing or invalid');
    return res.status(503).json({
      success: false,
      message: 'Forecast service is not configured',
    });
  }

  try {
    const response = await axios.post(
      predictionUrl,
      {
        product_id: req.params.productId,
        days: Math.min(Number(req.query.days) || 7, 30),
      },
      { timeout: 15000 }
    );

    if (
      !response.data ||
      typeof response.data !== 'object' ||
      typeof response.data.product_id !== 'string' ||
      !Array.isArray(response.data.predictions)
    ) {
      console.error('[forecast] ML service returned an unexpected response');
      return res.status(502).json({
        success: false,
        message: 'Invalid response from forecast service',
      });
    }

    return res.json({ success: true, data: response.data });
  } catch (error) {
    const upstreamStatus = error.response?.status;
    console.error('[forecast] ML request failed', {
      code: error.code || 'UNKNOWN',
      upstreamStatus: upstreamStatus || null,
    });

    if (upstreamStatus) {
      if (upstreamStatus < 500) {
        return res.status(upstreamStatus).json({
          message: errorDetail(error) || 'Forecast request failed',
        });
      }

      return res.status(502).json({
        success: false,
        message: 'Forecast service unavailable',
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        message: 'Forecast service timed out',
      });
    }

    if (error.request) {
      return res.status(502).json({
        success: false,
        message: 'Forecast service unavailable',
      });
    }

    return next(error);
  }
});

module.exports = { forecastRoutes, getPredictionUrl };
