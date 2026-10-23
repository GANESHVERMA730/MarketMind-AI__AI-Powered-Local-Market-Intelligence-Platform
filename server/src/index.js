const { env, assertAuthConfig } = require('./config/env');
const { connectDb, registerDbEvents } = require('./config/db');
const { createApp } = require('./app');

async function start() {
  try {
    assertAuthConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (!env.mongodbUri) {
    console.error(
      'MONGODB_URI is not set. Copy server/.env.example to server/.env and add a MongoDB connection string.'
    );
    process.exit(1);
  }

  registerDbEvents();

  try {
    await connectDb();
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error(
      'Start MongoDB locally or set MONGODB_URI to an Atlas cluster, then restart the server.'
    );
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`MarketMind API listening on http://localhost:${env.port}`);
  });
}

start();
