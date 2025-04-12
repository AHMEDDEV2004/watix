const ApiToken = require('../models/apiTokenModel');

// @desc    Create a new API token
// @route   POST /api/webhooks/tokens
// @access  Private
const createToken = async (req, res) => {
  try {
    const { name, expiresIn = 30 } = req.body;
    
    // Set content type for all responses
    res.setHeader('Content-Type', 'application/json');
    
    if (!name) {
      return res.status(400).json({ message: 'Token name is required' });
    }
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expiresIn));
    
    // Generate token value
    const tokenValue = ApiToken.generateToken();
    
    // Create token in database
    const apiToken = await ApiToken.create({
      name,
      userId: req.user._id,
      token: tokenValue,
      expiresAt
    });
    
    // Return the token data
    res.status(201).json({
      _id: apiToken._id,
      name: apiToken.name,
      token: tokenValue, // Only return the token value once
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt
    });
  } catch (error) {
    console.error('Token creation error:', error);
    res.status(500).json({ message: error.message || 'Server error occurred' });
  }
};

// @desc    Get all user's API tokens
// @route   GET /api/webhooks/tokens
// @access  Private
const getUserTokens = async (req, res) => {
  try {
    // Set content type for all responses
    res.setHeader('Content-Type', 'application/json');
    
    // Find all active tokens for the user
    const tokens = await ApiToken.find({ 
      userId: req.user._id,
      isRevoked: false
    }).sort({ createdAt: -1 });
    
    // Return the tokens without the actual token value for security
    const safeTokens = tokens.map(token => ({
      _id: token._id,
      name: token.name,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      lastUsed: token.lastUsed,
      isExpired: token.isExpired()
    }));
    
    res.json(safeTokens);
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ message: error.message || 'Server error occurred' });
  }
};

// @desc    Revoke an API token
// @route   DELETE /api/webhooks/tokens/:id
// @access  Private
const revokeToken = async (req, res) => {
  try {
    // Set content type for all responses
    res.setHeader('Content-Type', 'application/json');
    
    const token = await ApiToken.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }
    
    // Revoke the token
    await token.revoke();
    
    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    console.error('Revoke token error:', error);
    res.status(500).json({ message: error.message || 'Server error occurred' });
  }
};

// @desc    Validate a token (for webhook authentication)
// @route   Internal function
// @access  Internal
const validateToken = async (tokenValue) => {
  try {
    const token = await ApiToken.findOne({ token: tokenValue });
    
    if (!token || token.isRevoked || token.isExpired()) {
      return null;
    }
    
    // Record token usage
    await token.recordUsage();
    
    return token;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
};

module.exports = {
  createToken,
  getUserTokens,
  revokeToken,
  validateToken
}; 