const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/authLimiter');
const { validateRequest } = require('../middleware/validate');
const { registerValidators, loginValidators } = require('../validators/authValidators');

const authRoutes = express.Router();

authRoutes.post('/register', authLimiter, registerValidators, validateRequest, register);
authRoutes.post('/login', authLimiter, loginValidators, validateRequest, login);
authRoutes.get('/me', requireAuth, getMe);

module.exports = { authRoutes };
