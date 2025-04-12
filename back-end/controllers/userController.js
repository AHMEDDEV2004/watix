const User = require('../models/userModel');
const UserCredit = require('../models/userCreditModel');
const jwt = require('jsonwebtoken');
const Agent = require('../models/agentModel');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate a unique ID for the user
    const id = 'USR_' + Date.now().toString();

    // Create user
    const user = await User.create({
      id,
      name,
      email,
      password,
      phoneNumber,
      authenticationMethod: 'email',
      subscriptionPlan: 'Free'
    });

    if (user) {
      // Create credit account for the user
      await UserCredit.create({
        userId: user._id,
        totalCredits: 100, // Default for free plan
        usedCredits: 0
      });

      res.status(201).json({
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        authenticationMethod: user.authenticationMethod,
        subscriptionPlan: user.subscriptionPlan,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && await user.login(password)) {
      res.json({
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        authenticationMethod: user.authenticationMethod,
        subscriptionPlan: user.subscriptionPlan,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user (client side should remove token)
// @route   POST /api/users/logout
// @access  Private
const logoutUser = (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upgrade user subscription plan
// @route   PUT /api/users/upgrade
// @access  Private
const upgradeUserPlan = async (req, res) => {
  try {
    const { subscriptionPlan } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      const upgraded = user.upgradePlan(subscriptionPlan);
      if (upgraded) {
        await user.save();
        res.json({
          _id: user._id,
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          authenticationMethod: user.authenticationMethod,
          subscriptionPlan: user.subscriptionPlan,
        });
      } else {
        res.status(400).json({ message: 'Invalid subscription plan' });
      }
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const userCredit = await UserCredit.findOne({ userId: req.user._id });

    if (user) {
      res.json({
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        authenticationMethod: user.authenticationMethod,
        subscriptionPlan: user.subscriptionPlan,
        credits: userCredit ? {
          total: userCredit.totalCredits,
          used: userCredit.usedCredits,
          available: userCredit.totalCredits - userCredit.usedCredits
        } : null
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user credits
// @route   GET /api/users/credits
// @access  Private
const getUserCredits = async (req, res) => {
  try {
    let userCredit = await UserCredit.findOne({ userId: req.user._id });
    
    // If credit record doesn't exist, create it
    if (!userCredit) {
      userCredit = await UserCredit.create({
        userId: req.user._id,
        totalCredits: 100, // Default for free plan
        usedCredits: 0
      });
    }
    
    res.json({
      total: userCredit.totalCredits,
      used: userCredit.usedCredits,
      available: userCredit.totalCredits - userCredit.usedCredits,
      lastReset: userCredit.lastResetDate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Use credits
// @route   POST /api/users/credits/use
// @access  Private
const useCredits = async (req, res) => {
  try {
    const { amount = 1 } = req.body;
    let userCredit = await UserCredit.findOne({ userId: req.user._id });
    
    // If credit record doesn't exist, create it
    if (!userCredit) {
      userCredit = await UserCredit.create({
        userId: req.user._id,
        totalCredits: 100, // Default for free plan
        usedCredits: 0
      });
    }
    
    const success = await userCredit.useCredits(amount);
    
    if (success) {
      res.json({
        success: true,
        total: userCredit.totalCredits,
        used: userCredit.usedCredits,
        available: userCredit.totalCredits - userCredit.usedCredits
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: 'Not enough credits'
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset user credits
// @route   POST /api/users/credits/reset
// @access  Private (Admin only)
const resetCredits = async (req, res) => {
  try {
    const { userId } = req.body;
    let userCredit = await UserCredit.findOne({ userId });
    
    if (!userCredit) {
      return res.status(404).json({ message: 'User credit record not found' });
    }
    
    await userCredit.resetCredits();
    
    res.json({
      success: true,
      total: userCredit.totalCredits,
      used: userCredit.usedCredits,
      available: userCredit.totalCredits - userCredit.usedCredits,
      lastReset: userCredit.lastResetDate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get user subscription
 * @route   GET /api/users/subscription
 * @access  Private
 */
const getUserSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Define default subscription if user doesn't have one
    const defaultSubscription = {
      plan: 'Free',
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      status: 'active',
      paymentMethod: 'free',
      features: {
        agentLimit: 5,
        messageLimit: 100,
        webhooks: false,
        customModels: false,
        fileAttachments: false
      }
    };
    
    const subscription = user.subscription || defaultSubscription;
    
    // Count user's existing agents
    const agentCount = await Agent.countDocuments({ owner: req.user._id });
    
    // Agent limit based on plan
    const PLAN_LIMITS = {
      'Free': 5,
      'Basic': 20,
      'Premium': 100,
      'Enterprise': Infinity
    };
    
    const agentLimit = PLAN_LIMITS[subscription.plan] || 5;
    
    return res.json({
      success: true,
      subscription: {
        ...subscription._doc || subscription,
        usage: {
          agents: {
            used: agentCount,
            limit: agentLimit,
            percentage: Math.round((agentCount / agentLimit) * 100)
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch subscription information' 
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  upgradeUserPlan,
  getUserProfile,
  getUserCredits,
  useCredits,
  resetCredits,
  getUserSubscription
}; 