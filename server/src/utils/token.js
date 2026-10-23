const jwt = require('jsonwebtoken');
const { env, assertAuthConfig } = require('../config/env');

function signAuthToken(userId) {
  assertAuthConfig();
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyAuthToken(token) {
  assertAuthConfig();
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
