const express = require('express');
const router = express.Router();
const {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getAgentPerformance,
  getUsageDistribution,
  getUserActivities,
  getBillingActivities
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Analytics routes
router.get('/summary', getAnalyticsSummary);
router.get('/trends', getAnalyticsTrends);
router.get('/agent-performance', getAgentPerformance);
router.get('/usage-distribution', getUsageDistribution);
router.get('/activities', getUserActivities);

// This route is duplicated in userRoutes for backward compatibility
router.get('/billing/activities', getBillingActivities);

module.exports = router; 