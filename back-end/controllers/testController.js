const geminiService = require('../services/geminiService');
const UserCredit = require('../models/userCreditModel');

/**
 * @desc    Test the Gemini API directly
 * @route   POST /api/test/gemini
 * @access  Private
 */
const testGeminiAPI = async (req, res) => {
  try {
    const { 
      query, 
      model = 'whatco-small', 
      systemPrompt = 'You are a helpful assistant.', 
      temperature = 0.7,
      maxTokens = 1000,
      topK = 40
    } = req.body;
    
    // Validate required parameters
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Check if model is valid
    if (!['whatco-small', 'whatco-large', 'gemini-pro'].includes(model)) {
      return res.status(400).json({ message: 'Invalid model. Choose from whatco-small, whatco-large, or gemini-pro' });
    }

    // Check if user has sufficient credits
    let userCredit = await UserCredit.findOne({ userId: req.user._id });
      
    // If credit record doesn't exist, create it
    if (!userCredit) {
      userCredit = await UserCredit.create({
        userId: req.user._id,
        totalCredits: 100, // Default for free plan
        usedCredits: 0
      });
    }
    
    // Determine credit cost based on model
    let creditCost = 1; // Default cost
    if (model === 'whatco-large' || model === 'gemini-pro') {
      creditCost = 2; // Higher cost for more powerful models
    }
    
    // Check if user has enough credits
    const availableCredits = userCredit.getAvailableCredits();
    if (availableCredits < creditCost) {
      return res.status(403).json({ 
        message: 'Insufficient credits for this operation',
        availableCredits,
        requiredCredits: creditCost
      });
    }

    // Create a mock agent object for the geminiService
    const mockAgent = {
      name: 'Test Agent',
      aiModel: model, // whatco-small, whatco-large, or gemini-pro
      promptSystem: systemPrompt,
      temperature,
      maxTokens,
      topK,
    };

    // Process with Gemini API
    const startTime = Date.now();
    const result = await geminiService.processAgentRequest(mockAgent, { 
      query, 
      history: [] // No history for test API
    });
    
    // Deduct credits if request was successful
    if (result.success) {
      let creditCost = model === 'whatco-large' || model === 'gemini-pro' ? 2 : 1;
      await userCredit.useCredits(creditCost);
      
      console.log(`Deducted ${creditCost} credits from user ${req.user._id} for test using ${model}`);
    }

    // Return the result
    res.status(200).json({
      ...result,
      creditCost,
      availableCreditsRemaining: userCredit.getAvailableCredits()
    });
    
  } catch (error) {
    console.error('Error in testGeminiAPI:', error);
    res.status(500).json({ 
      message: 'Failed to process test request',
      error: error.message
    });
  }
};

/**
 * @desc    Quick test with Gemini 2.0 Flash (whatco-small)
 * @route   POST /api/test/quick
 * @access  Private
 */
const quickTest = async (req, res) => {
  try {
    const { query } = req.body;
    
    // Set body to use whatco-small model
    req.body.model = 'whatco-small';
    req.body.systemPrompt = 'You are a helpful assistant. Keep responses brief and to the point.';
    
    // Call the main test function
    await testGeminiAPI(req, res);
    
  } catch (error) {
    console.error('Error in quickTest:', error);
    res.status(500).json({ 
      message: 'Failed to process quick test',
      error: error.message
    });
  }
};

/**
 * @desc    Advanced test with Gemini 1.5 Pro (whatco-large)
 * @route   POST /api/test/advanced
 * @access  Private
 */
const advancedTest = async (req, res) => {
  try {
    const { query } = req.body;
    
    // Set body to use whatco-large model
    req.body.model = 'whatco-large';
    req.body.systemPrompt = 'You are a helpful assistant. Provide detailed, thoughtful responses.';
    
    // Call the main test function
    await testGeminiAPI(req, res);
    
  } catch (error) {
    console.error('Error in advancedTest:', error);
    res.status(500).json({ 
      message: 'Failed to process advanced test',
      error: error.message
    });
  }
};

/**
 * @desc    Get user's available credits
 * @route   GET /api/test/credits
 * @access  Private
 */
const getTestCredits = async (req, res) => {
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
      modelCosts: {
        'whatco-small': 1,
        'whatco-large': 2,
        'gemini-pro': 2
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  testGeminiAPI,
  quickTest,
  advancedTest,
  getTestCredits
}; 