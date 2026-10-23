const { getDbStatus } = require('../config/db');
const { env } = require('../config/env');

function getHealth(_req, res) {
  const database = getDbStatus();
  const healthy = database.connected;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      service: 'marketmind-server',
      status: healthy ? 'ok' : 'degraded',
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      database,
    },
    message: healthy
      ? 'Server is running and connected to MongoDB'
      : 'Server is running but MongoDB is not connected',
  });
}

module.exports = { getHealth };
