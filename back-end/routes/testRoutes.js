const express = require('express');
const router = express.Router();
const { 
  testGeminiAPI, 
  quickTest, 
  advancedTest, 
  getTestCredits 
} = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');

// All test routes are protected
router.use(protect);

// Test routes
router.post('/gemini', testGeminiAPI);
router.post('/quick', quickTest);
router.post('/advanced', advancedTest);
router.get('/credits', getTestCredits);

module.exports = router; 