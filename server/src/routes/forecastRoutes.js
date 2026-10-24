const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const LOCAL_ML_SERVICE_URL = 'http://127.0.0.1:8000';
const forecastRoutes = express.Router();
const SAFE_PREVIEW_TERMS = new Set([
  'bad',
  'gateway',
  'upstream',
  'connect',
  'connection',
  'error',
  'internal',
  'server',
  'proxy',
  'service',
  'unavailable',
  'temporarily',
  'request',
  'failed',
  'failure',
  'timeout',
  'timed',
  'out',
  'too',
  'many',
  'rate',
  'limit',
  'not',
  'found',
  'method',
  'allowed',
  'cloudflare',
  'nginx',
  'render',
]);

function getContentType(response) {
  const headers = response?.headers;
  const value =
    typeof headers?.get === 'function'
      ? headers.get('content-type')
      : headers?.['content-type'];

  if (typeof value !== 'string') return 'unknown';

  const mediaType = value.split(';', 1)[0].trim().toLowerCase();
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mediaType)
    ? mediaType
    : 'unknown';
}

function getSafeResponsePreview(data) {
  if (typeof data !== 'string' && !Buffer.isBuffer(data)) return '[unavailable]';

  const text = (Buffer.isBuffer(data) ? data.toString('utf8') : data)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi, ' ')
    .replace(/\bhttps?:\/\/\S+/gi, ' ')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, ' ')
    .replace(/\b[a-f\d]{24}\b/gi, ' ')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, ' ');

  const terms = text.toLowerCase().match(/[a-z]{2,}/g) || [];
  const safeTerms = terms.filter((term) => SAFE_PREVIEW_TERMS.has(term)).slice(0, 20);
  return safeTerms.join(' ') || '[no safe preview]';
}

function isJsonContentType(contentType) {
  return contentType === 'application/json' || contentType.endsWith('+json');
}

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
    const failureDetails = {
      code: error.code || 'UNKNOWN',
      upstreamStatus: upstreamStatus || null,
    };

    if (error.response) {
      const contentType = getContentType(error.response);
      failureDetails.contentType = contentType;
      if (!isJsonContentType(contentType)) {
        failureDetails.responsePreview = getSafeResponsePreview(error.response.data);
      }
    }

    console.error('[forecast] ML request failed', failureDetails);

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

module.exports = {
  forecastRoutes,
  getPredictionUrl,
  getContentType,
  getSafeResponsePreview,
};
