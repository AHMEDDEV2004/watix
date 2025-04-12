const express = require('express');
const router = express.Router();
const {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  processAgentRequest,
  toggleAgentStatus,
  getAgentActivities,
  getAgentPerformance,
  getRecentAgentActivities,
  getAgentKnowledge,
  addAgentKnowledge,
  updateAgentKnowledge,
  deleteAgentKnowledge
} = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');
const agentLimitMiddleware = require('../middleware/agentLimitMiddleware');

// Protected routes
router.use(protect);

// Base agent routes
router.route('/')
  .post(agentLimitMiddleware, createAgent)
  .get(getAgents);

// Agent-specific routes
router.route('/:id')
  .get(getAgentById)
  .put(updateAgent)
  .delete(deleteAgent);

// Process a request with an agent
router.post('/:id/process', processAgentRequest);

// Toggle agent status
router.put('/:id/toggle-status', toggleAgentStatus);

// Knowledge base routes
router.route('/:id/knowledge')
  .get(getAgentKnowledge)
  .post(addAgentKnowledge);

router.route('/:id/knowledge/:entryId')
  .put(updateAgentKnowledge)
  .delete(deleteAgentKnowledge);

// Analytics routes
router.get('/:id/activities', getAgentActivities);
router.get('/:id/performance', getAgentPerformance);
router.get('/:id/recent-activities', getRecentAgentActivities);

module.exports = router; 