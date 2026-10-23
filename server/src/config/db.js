const mongoose = require('mongoose');
const { env, isProduction } = require('./env');

mongoose.set('strictQuery', true);

async function connectDb(uri = env.mongodbUri) {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy server/.env.example to server/.env and provide a MongoDB connection string.'
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  return mongoose.connection;
}

async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

function getDbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  return {
    connected: readyState === 1,
    state: states[readyState] || 'unknown',
  };
}

function registerDbEvents() {
  mongoose.connection.on('error', (err) => {
    const message = isProduction() ? 'MongoDB connection error' : err.message;
    console.error(message);
  });
}

module.exports = {
  connectDb,
  disconnectDb,
  getDbStatus,
  registerDbEvents,
};
