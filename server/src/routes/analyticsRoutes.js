const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { getDashboard } = require('../controllers/analyticsController');
const { analyticsValidators } = require('../validators/analyticsValidators');

const analyticsRoutes = express.Router();

analyticsRoutes.use(requireAuth);
analyticsRoutes.get('/dashboard', analyticsValidators, validateRequest, getDashboard);

module.exports = { analyticsRoutes };
