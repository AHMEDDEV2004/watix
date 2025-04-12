const express = require('express');
const router = express.Router();
const { 
  createToken, 
  getUserTokens, 
  revokeToken 
} = require('../controllers/webhookController');
const { protect } = require('../middleware/authMiddleware');

// API token routes (protected)
router.post('/tokens', protect, createToken);
router.get('/tokens', protect, getUserTokens);
router.delete('/tokens/:id', protect, revokeToken);

module.exports = router; 