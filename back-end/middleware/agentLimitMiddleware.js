/**
 * Middleware to check if a user has reached their agent limit based on subscription.
 * This middleware should be applied to routes that create new agents.
 */

const Agent = require('../models/agentModel');
const User = require('../models/userModel');

const agentLimitMiddleware = async (req, res, next) => {
  try {
    // Get user ID from authenticated request
    const userId = req.user.id;
    
    // Define plan limits
    const PLAN_LIMITS = {
      'Free': 5,
      'Basic': 20,
      'Premium': 100,
      'Enterprise': Infinity
    };
    
    // Get user subscription info from database
    const user = await User.findById(userId).select('subscription');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Get subscription plan name (default to Free)
    const planName = user.subscription?.plan || 'Free';
    
    // Get limit based on plan
    const agentLimit = PLAN_LIMITS[planName] || 5; // Default to Free limit if plan not found
    
    // Count user's existing agents
    const agentCount = await Agent.countDocuments({ user: userId });
    
    // Check if user has reached their limit
    if (agentCount >= agentLimit) {
      return res.status(403).json({
        success: false,
        message: `You've reached the maximum number of agents allowed on your ${planName} plan. Please upgrade to create more agents.`,
        limit: {
          current: agentCount,
          maximum: agentLimit,
          plan: planName
        }
      });
    }
    
    // Add limit info to request for possible use in controller
    req.agentLimitInfo = {
      current: agentCount,
      maximum: agentLimit,
      plan: planName,
      remaining: agentLimit - agentCount
    };
    
    // User is under the limit, proceed to next middleware/controller
    next();
    
  } catch (error) {
    console.error('Error in agent limit middleware:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check agent limit',
      error: error.message 
    });
  }
};

module.exports = agentLimitMiddleware; 