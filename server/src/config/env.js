const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    return null;
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
};

function assertAuthConfig() {
  if (!env.jwtSecret || env.jwtSecret.length < 16) {
    throw new Error(
      'JWT_SECRET is missing or too short. Copy server/.env.example to server/.env and set a random secret of at least 16 characters.'
    );
  }
}

function isProduction() {
  return env.nodeEnv === 'production';
}

function isTest() {
  return env.nodeEnv === 'test';
}

module.exports = {
  env,
  assertAuthConfig,
  isProduction,
  isTest,
};
