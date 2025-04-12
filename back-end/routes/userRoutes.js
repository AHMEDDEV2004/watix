const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  upgradeUserPlan,
  getUserProfile,
  getUserCredits,
  useCredits,
  resetCredits,
  getUserSubscription
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/', registerUser);
router.post('/login', loginUser);

// Protected routes
router.post('/logout', protect, logoutUser);
router.put('/upgrade', protect, upgradeUserPlan);
router.get('/profile', protect, getUserProfile);

// Credit routes
router.get('/credits', protect, getUserCredits);
router.post('/credits/use', protect, useCredits);
router.post('/credits/reset', protect, admin, resetCredits);

// Subscription routes
router.get('/subscription', protect, getUserSubscription);

module.exports = router; 