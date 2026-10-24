const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');
const { authRoutes } = require('./routes/authRoutes');
const { healthRoutes } = require('./routes/healthRoutes');
const { productRoutes } = require('./routes/productRoutes');
const { saleRoutes } = require('./routes/saleRoutes');
const { analyticsRoutes } = require('./routes/analyticsRoutes');
const { forecastRoutes } = require('./routes/forecastRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '16kb' }));

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'MarketMind AI API',
      data: { health: '/api/health' },
    });
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/forecasts', forecastRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
