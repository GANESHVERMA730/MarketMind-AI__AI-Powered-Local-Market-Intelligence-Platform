jest.mock('axios');
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const axios = require('axios');
const { forecastRoutes, getPredictionUrl } = require('../src/routes/forecastRoutes');

function createForecastApp() {
  const app = express();
  app.use('/api/forecasts', forecastRoutes);
  app.use((error, _req, res, _next) => {
    res.status(500).json({ message: error.message });
  });
  return app;
}

const validForecast = {
  product_id: '90aa352d04b6d86df9055a07',
  product_name: 'Green Tea 25 bags',
  forecast_days: 7,
  predictions: [{ date: '2026-10-24', predicted_demand: 0.63 }],
};

describe('forecast route', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMlServiceUrl = process.env.ML_SERVICE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalMlServiceUrl === undefined) {
      delete process.env.ML_SERVICE_URL;
    } else {
      process.env.ML_SERVICE_URL = originalMlServiceUrl;
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('appends /predict once and forwards the product ID and horizon', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ML_SERVICE_URL = 'https://ml.example.com/';
    axios.post.mockResolvedValue({ data: validForecast });

    const response = await request(createForecastApp())
      .get('/api/forecasts/90aa352d04b6d86df9055a07?days=7');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(validForecast);
    expect(axios.post).toHaveBeenCalledWith(
      'https://ml.example.com/predict',
      { product_id: '90aa352d04b6d86df9055a07', days: 7 },
      { timeout: 15000 }
    );
  });

  test('does not fall back to loopback in production without configuration', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ML_SERVICE_URL;
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(createForecastApp())
      .get('/api/forecasts/90aa352d04b6d86df9055a07');

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Forecast service is not configured');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('does not assume an unspecified runtime is local development', async () => {
    delete process.env.NODE_ENV;
    delete process.env.ML_SERVICE_URL;
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(createForecastApp())
      .get('/api/forecasts/90aa352d04b6d86df9055a07');

    expect(response.status).toBe(503);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('does not allow a loopback ML service URL in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ML_SERVICE_URL = 'http://127.0.0.1:8000/';

    expect(getPredictionUrl()).toBeNull();
  });

  test('does not append /predict twice when configured with the endpoint path', () => {
    process.env.NODE_ENV = 'production';
    process.env.ML_SERVICE_URL = 'https://ml.example.com/predict/';

    expect(getPredictionUrl()).toBe('https://ml.example.com/predict');
  });

  test('logs upstream JSON status without exposing its body', async () => {
    process.env.ML_SERVICE_URL = 'https://ml.example.com';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.post.mockRejectedValue({
      code: 'ERR_BAD_RESPONSE',
      response: {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        data: { detail: 'private upstream diagnostic' },
      },
    });

    const response = await request(createForecastApp())
      .get('/api/forecasts/90aa352d04b6d86df9055a07');

    expect(response.status).toBe(502);
    expect(response.body.message).toBe('Forecast service unavailable');
    expect(JSON.stringify(response.body)).not.toContain('private upstream diagnostic');
    expect(console.error).toHaveBeenCalledWith('[forecast] ML request failed', {
      code: 'ERR_BAD_RESPONSE',
      upstreamStatus: 503,
      contentType: 'application/json',
    });
  });

  test('logs a safe preview for non-JSON proxy errors without leaking body data', async () => {
    process.env.ML_SERVICE_URL = 'https://ml.example.com';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.post.mockRejectedValue({
      code: 'ERR_BAD_RESPONSE',
      response: {
        status: 502,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        data: '<html><body><h1>502 Bad Gateway</h1><p>upstream connect error. Bibek bibek@example.com 90aa352d04b6d86df9055a07 https://private.example/path bearer-secret-should-not-appear</p></body></html>',
      },
    });

    const response = await request(createForecastApp())
      .get('/api/forecasts/90aa352d04b6d86df9055a07');

    expect(response.status).toBe(502);
    expect(console.error).toHaveBeenCalledWith('[forecast] ML request failed', {
      code: 'ERR_BAD_RESPONSE',
      upstreamStatus: 502,
      contentType: 'text/html',
      responsePreview: 'bad gateway upstream connect error',
    });
    const loggedDetails = JSON.stringify(console.error.mock.calls[0]);
    expect(loggedDetails).not.toContain('Bibek');
    expect(loggedDetails).not.toContain('bibek@example.com');
    expect(loggedDetails).not.toContain('90aa352d04b6d86df9055a07');
    expect(loggedDetails).not.toContain('private.example');
    expect(loggedDetails).not.toContain('bearer-secret');
  });

  test('maps upstream timeouts to 504', async () => {
    process.env.ML_SERVICE_URL = 'https://ml.example.com';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.post.mockRejectedValue({ code: 'ECONNABORTED' });

    const response = await request(createForecastApp())
      .get('/api/forecasts/90aa352d04b6d86df9055a07');

    expect(response.status).toBe(504);
    expect(response.body.message).toBe('Forecast service timed out');
  });

  test('uses the local default outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ML_SERVICE_URL;

    expect(getPredictionUrl()).toBe('http://127.0.0.1:8000/predict');
  });
});
