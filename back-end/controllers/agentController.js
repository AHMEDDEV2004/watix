const Agent = require('../models/agentModel');
const User = require('../models/userModel');
const UserCredit = require('../models/userCreditModel');
const AgentActivity = require('../models/agentActivityModel');
const AgentPerformance = require('../models/agentPerformanceModel');
const KnowledgeBase = require('../models/knowledgeBaseModel');
const geminiService = require('../services/geminiService');
const mongoose = require('mongoose');

// Helper function to log agent activity
const logAgentActivity = async (agentId, userId, type, description, metadata = {}) => {
  try {
    await AgentActivity.create({
      agentId,
      type,
      description,
      metadata,
      user: userId,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error logging agent activity:', err);
  }
};

// Helper function to record agent performance data (called daily or after each interaction)
const recordAgentPerformance = async (agentId, metrics) => {
  try {
    // Get today's date with time set to midnight for daily grouping
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find or create today's performance record
    let performance = await AgentPerformance.findOne({ 
      agentId, 
      date: { 
        $gte: today, 
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
      } 
    });
    
    if (!performance) {
      performance = new AgentPerformance({
        agentId,
        date: today
      });
    }
    
    // Update performance metrics
    if (metrics.totalResponses !== undefined) {
      performance.totalResponses += metrics.totalResponses;
    }
    
    if (metrics.successfulResponses !== undefined) {
      performance.successfulResponses += metrics.successfulResponses;
    }
    
    if (metrics.failedResponses !== undefined) {
      performance.failedResponses += metrics.failedResponses;
    }
    
    if (metrics.responseTime !== undefined) {
      // Calculate rolling average for response time
      const currentTotal = performance.averageResponseTime * (performance.totalResponses - 1);
      const newTotal = currentTotal + metrics.responseTime;
      performance.averageResponseTime = newTotal / performance.totalResponses;
    }
    
    if (metrics.accuracy !== undefined) {
      performance.accuracy = metrics.accuracy;
    }
    
    if (metrics.tokenUsage !== undefined) {
      performance.tokenUsage += metrics.tokenUsage;
    }
    
    await performance.save();
  } catch (err) {
    console.error('Error recording agent performance:', err);
  }
};

// @desc    Create a new agent
// @route   POST /api/agents
// @access  Private
const createAgent = async (req, res) => {
  try {
    const { 
      name, 
      aiModel, 
      promptSystem, 
      firstMessage, 
      description, 
      type, 
      category,
      temperature,
      maxTokens,
      topK,
      processAudio,
      processVideo,
      processImages,
      processFiles,
      tools,
      extractVariables,
      variables,
      enableWebhook,
      enableLogging
    } = req.body;
    
    // Generate a unique ID for the agent
    const id = 'AGENT_' + Date.now().toString();
    
    // Create the agent
    const agent = await Agent.create({
      id,
      name,
      aiModel: aiModel || 'whatco-small',
      promptSystem,
      firstMessage: firstMessage || "Hello! How can I assist you today?",
      description,
      type: type || 'single',
      category: category || 'general',
      owner: req.user._id,
      status: 'inactive',
      // Media processing capabilities
      processAudio: processAudio || false,
      processVideo: processVideo || false,
      processImages: processImages || false,
      processFiles: processFiles || false,
      // Advanced settings
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1000,
      topK: topK || 40,
      // Tools and variables
      tools: tools || [],
      extractVariables: extractVariables || false,
      variables: variables || [],
      // Integration settings
      enableWebhook: enableWebhook || false,
      enableLogging: enableLogging || false
    });
    
    // Log agent creation activity
    await logAgentActivity(
      agent.id, 
      req.user._id, 
      'creation', 
      'Agent created successfully', 
      { agentName: agent.name }
    );
    
    // Include agent limit information if available from middleware
    const response = {
      agent,
      success: true
    };

    // Add limit information if provided by the middleware
    if (req.agentLimitInfo) {
      response.limitInfo = req.agentLimitInfo;
    }
    
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all agents for a user
// @route   GET /api/agents
// @access  Private
const getAgents = async (req, res) => {
  try {
    const agents = await Agent.find({ owner: req.user._id });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single agent
// @route   GET /api/agents/:id
// @access  Private
const getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if the agent belongs to the user
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an agent
// @route   PUT /api/agents/:id
// @access  Private
const updateAgent = async (req, res) => {
  try {
    let agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if the agent belongs to the user
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this agent' });
    }
    
    // Fields that can be updated
    const { 
      name, 
      aiModel, 
      promptSystem, 
      firstMessage, 
      description, 
      category,
      temperature,
      maxTokens,
      topK,
      processAudio,
      processVideo,
      processImages,
      processFiles,
      tools,
      extractVariables,
      variables,
      enableWebhook,
      enableLogging
    } = req.body;
    
    // Track what changes were made for activity logging
    const changes = {};
    
    if (name !== undefined && name !== agent.name) changes.name = { from: agent.name, to: name };
    if (aiModel !== undefined && aiModel !== agent.aiModel) changes.aiModel = { from: agent.aiModel, to: aiModel };
    if (promptSystem !== undefined && promptSystem !== agent.promptSystem) changes.promptSystem = true;
    if (firstMessage !== undefined && firstMessage !== agent.firstMessage) changes.firstMessage = true;
    if (description !== undefined && description !== agent.description) changes.description = true;
    if (category !== undefined && category !== agent.category) changes.category = { from: agent.category, to: category };
    if (temperature !== undefined && temperature !== agent.temperature) changes.temperature = { from: agent.temperature, to: temperature };
    if (maxTokens !== undefined && maxTokens !== agent.maxTokens) changes.maxTokens = { from: agent.maxTokens, to: maxTokens };
    if (topK !== undefined && topK !== agent.topK) changes.topK = { from: agent.topK, to: topK };
    if (processAudio !== undefined && processAudio !== agent.processAudio) changes.processAudio = { from: agent.processAudio, to: processAudio };
    if (processVideo !== undefined && processVideo !== agent.processVideo) changes.processVideo = { from: agent.processVideo, to: processVideo };
    if (processImages !== undefined && processImages !== agent.processImages) changes.processImages = { from: agent.processImages, to: processImages };
    if (processFiles !== undefined && processFiles !== agent.processFiles) changes.processFiles = { from: agent.processFiles, to: processFiles };
    if (extractVariables !== undefined && extractVariables !== agent.extractVariables) changes.extractVariables = { from: agent.extractVariables, to: extractVariables };
    if (enableWebhook !== undefined && enableWebhook !== agent.enableWebhook) changes.enableWebhook = { from: agent.enableWebhook, to: enableWebhook };
    if (enableLogging !== undefined && enableLogging !== agent.enableLogging) changes.enableLogging = { from: agent.enableLogging, to: enableLogging };
    
    // Update the agent
    agent = await Agent.findOneAndUpdate(
      { id: req.params.id },
      { 
        name, 
        aiModel, 
        promptSystem, 
        firstMessage, 
        description, 
        category,
        temperature,
        maxTokens,
        topK,
        processAudio,
        processVideo,
        processImages,
        processFiles,
        tools,
        extractVariables,
        variables,
        enableWebhook,
        enableLogging
      },
      { new: true, runValidators: true }
    );
    
    // Log agent update activity
    const changeKeys = Object.keys(changes);
    if (changeKeys.length > 0) {
      let description = 'Agent updated';
      
      if (changes.name) {
        description = `Agent renamed from "${changes.name.from}" to "${changes.name.to}"`;
      } else if (changeKeys.length === 1) {
        description = `Agent ${changeKeys[0]} updated`;
      } else {
        description = `Multiple agent properties updated (${changeKeys.join(', ')})`;
      }
      
      await logAgentActivity(
        agent.id, 
        req.user._id, 
        'update', 
        description, 
        { changes }
      );
    }
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an agent
// @route   DELETE /api/agents/:id
// @access  Private
const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if the agent belongs to the user
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this agent' });
    }
    
    // Store agent name before deletion for activity log
    const agentName = agent.name;
    
    // Delete associated knowledge base if exists
    if (agent.knowledgeBase) {
      await KnowledgeBase.deleteOne({ _id: agent.knowledgeBase });
    }
    
    // Delete associated agent activities
    await AgentActivity.deleteMany({ agentId: agent.id });
    
    // Delete associated agent performance records
    await AgentPerformance.deleteMany({ agentId: agent.id });
    
    // Delete the agent
    await Agent.deleteOne({ _id: agent._id });
    
    // Log agent deletion activity (to a different collection, for admin logging)
    await logAgentActivity(
      req.params.id, 
      req.user._id, 
      'deletion', 
      `Agent "${agentName}" deleted`, 
      { agentName }
    );
    
    res.json({ id: req.params.id });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process a request with an agent
// @route   POST /api/agents/:id/process
// @access  Private
const processAgentRequest = async (req, res) => {
  try {
    const { query, history } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if the agent is active
    if (agent.status !== 'active') {
      return res.status(400).json({ 
        message: 'Agent is not active',
        agentStatus: agent.status
      });
    }
    
    // Check if user has sufficient credits when using Gemini models
    if ( agent.aiModel === 'whatco-small' || agent.aiModel === 'whatco-large') {
      // Get user credits
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
      if (agent.aiModel === 'whatco-large' || agent.aiModel === 'gemini-pro') {
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
    }
    
    // Process the request
    const startTime = Date.now();
    
    // Check if the agent uses Gemini model
    let result;
    if ( agent.aiModel === 'whatco-small' || agent.aiModel === 'whatco-large') {
      // Process with Gemini API
      result = await geminiService.processAgentRequest(agent, { 
        query, 
        history: history || [] 
      });
      
      // Deduct credits if request was successful
      if (result.success) {
        let userCredit = await UserCredit.findOne({ userId: req.user._id });
        let creditCost = agent.aiModel === 'whatco-large' || agent.aiModel === 'gemini-pro' ? 2 : 1;
        await userCredit.useCredits(creditCost);
        
        console.log(`Deducted ${creditCost} credits from user ${req.user._id} for using ${agent.aiModel}`);
      }
    } else {
      // Use the existing processRequest method for non-Gemini models
      result = await agent.processRequest({ query, history });
    }
    
    const responseTime = (Date.now() - startTime) / 1000; // in seconds
    
    // Update agent's lastActive timestamp
    agent.lastActive = new Date();
    
    // Update agent stats
    agent.responses += 1;
    
    // Update the accuracy based on success
    // In a real system this would be determined by user feedback
    if (agent.responses === 1) {
      agent.accuracy = result.success ? 100 : 0;
    } else {
      agent.accuracy = ((agent.accuracy * (agent.responses - 1)) + (result.success ? 100 : 0)) / agent.responses;
    }
    
    await agent.save();
    
    // Log the interaction
    await logAgentActivity(
      agent.id,
      req.user._id,
      'interaction',
      `Agent processed request: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`,
      {
        query: query,
        success: result.success,
        responseTime: responseTime,
        tokenUsage: result.tokenUsage,
        model: agent.aiModel
      }
    );
    
    // Record performance metrics
    await recordAgentPerformance(agent.id, {
      totalResponses: 1,
      successfulResponses: result.success ? 1 : 0,
      failedResponses: result.success ? 0 : 1,
      responseTime: responseTime,
      accuracy: agent.accuracy,
      tokenUsage: result.tokenUsage || 0
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing agent request:', error);
    
    // Log the error
    if (req.params.id) {
      await logAgentActivity(
        req.params.id,
        req.user._id,
        'error',
        'Error processing request',
        { error: error.message }
      );
    }
    
    res.status(500).json({ 
      message: 'Failed to process request',
      error: error.message
    });
  }
};

// @desc    Toggle agent status (active/inactive)
// @route   PUT /api/agents/:id/toggle-status
// @access  Private
const toggleAgentStatus = async (req, res) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if the agent belongs to the user
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this agent' });
    }
    
    // Toggle status
    const previousStatus = agent.status;
    agent.status = agent.status === 'active' ? 'inactive' : 'active';
    const newStatus = agent.status;
    
    await agent.save();
    
    // Log agent status change activity
    await logAgentActivity(
      agent.id, 
      req.user._id, 
      'status', 
      `Agent status changed from ${previousStatus} to ${newStatus}`, 
      { previousStatus, newStatus }
    );
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get agent activities
// @route   GET /api/agents/:id/activities
// @access  Private
const getAgentActivities = async (req, res) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if the agent belongs to the user
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }
    
    // Get limit from query params or use default
    const limit = parseInt(req.query.limit) || 10;
    
    // Get real activities data from database
    const activities = await AgentActivity.find({ agentId: agent.id })
      .sort({ timestamp: -1 })
      .limit(limit);
      
    // Format the activities for frontend consumption
    const formattedActivities = activities.map(activity => {
      // Determine appropriate icon based on activity type
      let icon = '🔄';
      let iconClass = '';
      
      switch (activity.type) {
        case 'creation':
          icon = '✨';
          iconClass = 'success';
          break;
        case 'update':
          icon = '✏️';
          iconClass = '';
          break;
        case 'status':
          if (activity.metadata && activity.metadata.to === 'active') {
            icon = '✓';
            iconClass = 'success';
          } else {
            icon = '✕';
            iconClass = 'warning';
          }
          break;
        case 'interaction':
          icon = '💬';
          iconClass = '';
          break;
        case 'error':
          icon = '⚠️';
          iconClass = 'error';
          break;
        case 'deletion':
          icon = '🗑️';
          iconClass = 'warning';
          break;
        case 'config':
          icon = '⚙️';
          iconClass = '';
          break;
        default:
          icon = '🔄';
          iconClass = '';
      }
      
      return {
        id: activity._id,
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp,
        icon,
        iconClass
      };
    });
    
    res.json(formattedActivities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get agent performance metrics
// @route   GET /api/agents/:id/performance
// @access  Private
const getAgentPerformance = async (req, res) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if the agent belongs to the user
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }
    
    const { timeframe } = req.query; // day, week, month
    
    // Determine date range based on timeframe
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default: // day
        startDate.setDate(startDate.getDate() - 1);
    }
    
    // Get aggregated performance data
    const performanceData = await AgentPerformance.find({
      agentId: agent.id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1 });
    
    // Calculate totals
    let totalResponses = 0;
    let totalSuccessfulResponses = 0;
    let totalResponseTime = 0;
    let totalTokens = 0;
    
    performanceData.forEach(data => {
      totalResponses += data.totalResponses;
      totalSuccessfulResponses += data.successfulResponses;
      totalResponseTime += data.averageResponseTime * data.totalResponses;
      totalTokens += data.tokenUsage;
    });
    
    // Calculate accuracy and average response time
    const accuracy = totalResponses > 0 
      ? (totalSuccessfulResponses / totalResponses) * 100 
      : agent.accuracy;
    
    const averageResponseTime = totalResponses > 0 
      ? totalResponseTime / totalResponses
      : 0;
    
    // Get previous period data for comparison
    let prevStartDate = new Date(startDate);
    let prevEndDate = new Date(endDate);
    
    switch (timeframe) {
      case 'week':
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate.setDate(prevEndDate.getDate() - 7);
        break;
      case 'month':
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        prevEndDate.setMonth(prevEndDate.getMonth() - 1);
        break;
      default: // day
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
    }
    
    const prevPerformance = await AgentPerformance.find({
      agentId: agent.id,
      date: {
        $gte: prevStartDate,
        $lte: prevEndDate
      }
    });
    
    // Calculate previous period totals
    let prevTotalResponses = 0;
    let prevTotalSuccessfulResponses = 0;
    let prevTotalResponseTime = 0;
    
    prevPerformance.forEach(data => {
      prevTotalResponses += data.totalResponses;
      prevTotalSuccessfulResponses += data.successfulResponses;
      prevTotalResponseTime += data.averageResponseTime * data.totalResponses;
    });
    
    const prevAccuracy = prevTotalResponses > 0 
      ? (prevTotalSuccessfulResponses / prevTotalResponses) * 100 
      : 0;
    
    const prevAverageResponseTime = prevTotalResponses > 0 
      ? prevTotalResponseTime / prevTotalResponses 
      : 0;
    
    // Calculate change percentages
    const calculateChange = (current, previous) => {
      if (previous === 0) return '+0%';
      const change = ((current - previous) / previous) * 100;
      return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
    };
    
    // Format the performance metrics for frontend consumption
    const performance = {
      responses: totalResponses,
      accuracy: accuracy,
      status: agent.status,
      responseTime: averageResponseTime || 1.8, // Default to 1.8s if no data
      lastActive: agent.lastActive,
      tokenUsage: totalTokens,
      // Add change percentages
      changes: {
        responses: calculateChange(totalResponses, prevTotalResponses),
        accuracy: calculateChange(accuracy, prevAccuracy),
        responseTime: calculateChange(averageResponseTime, prevAverageResponseTime)
      }
    };
    
    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get recent agent activities (only the most recent ones)
const getRecentAgentActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query; // Default to 4 recent activities
    
    // Find agent with the given ID
    const agent = await Agent.findOne({ id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Get the agent's activities, sorted by most recent first, limited to requested number
    const activities = await AgentActivity.find({ agentId: id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Format the activities for frontend consumption
    const formattedActivities = activities.map(activity => {
      // Determine appropriate icon based on activity type
      let icon = '🔄';
      let iconClass = '';
      
      switch (activity.type) {
        case 'creation':
          icon = '✨';
          iconClass = 'success';
          break;
        case 'update':
          icon = '✏️';
          iconClass = '';
          break;
        case 'status':
          if (activity.metadata && activity.metadata.newStatus === 'active') {
            icon = '✓';
            iconClass = 'success';
          } else {
            icon = '✕';
            iconClass = 'warning';
          }
          break;
        case 'interaction':
          icon = '💬';
          iconClass = '';
          break;
        case 'error':
          icon = '⚠️';
          iconClass = 'error';
          break;
        case 'deletion':
          icon = '🗑️';
          iconClass = 'warning';
          break;
        case 'config':
          icon = '⚙️';
          iconClass = '';
          break;
        case 'knowledge_add':
          icon = '📚';
          iconClass = 'success';
          break;
        case 'knowledge_update':
          icon = '📝';
          iconClass = '';
          break;
        case 'knowledge_delete':
          icon = '🗑️';
          iconClass = 'warning';
          break;
        default:
          icon = '🔄';
          iconClass = '';
      }
      
      return {
        id: activity._id,
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp,
        icon,
        iconClass,
        metadata: activity.metadata
      };
    });
    
    res.status(200).json(formattedActivities);
  } catch (error) {
    console.error('Error fetching recent agent activities:', error);
    res.status(500).json({ message: 'Failed to fetch recent agent activities' });
  }
};

/**
 * @desc    Get knowledge entries for an agent
 * @route   GET /api/agents/:id/knowledge
 * @access  Private
 */
const getAgentKnowledge = async (req, res) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check ownership
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }
    
    // Find or create knowledge base
    let knowledgeBase;
    if (agent.knowledgeBase) {
      knowledgeBase = await KnowledgeBase.findById(agent.knowledgeBase);
    }
    
    if (!knowledgeBase) {
      // Create a new knowledge base for this agent
      knowledgeBase = await KnowledgeBase.create({
        agent: agent._id,
        owner: req.user._id,
        name: `${agent.name} Knowledge Base`,
        description: `Knowledge Base for ${agent.name}`
      });
      
      // Update agent with reference to new knowledge base
      agent.knowledgeBase = knowledgeBase._id;
      await agent.save();
    }
    
    // Transform entries to ensure id is properly exposed
    const formattedEntries = knowledgeBase.entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }));
    
    // Return all entries
    return res.json(formattedEntries);
    
  } catch (error) {
    console.error('Error getting knowledge entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Add knowledge entry to an agent
 * @route   POST /api/agents/:id/knowledge
 * @access  Private
 */
const addAgentKnowledge = async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check ownership
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }
    
    // Find or create knowledge base
    let knowledgeBase;
    if (agent.knowledgeBase) {
      knowledgeBase = await KnowledgeBase.findById(agent.knowledgeBase);
    }
    
    if (!knowledgeBase) {
      // Create a new knowledge base for this agent
      knowledgeBase = await KnowledgeBase.create({
        agent: agent._id,
        owner: req.user._id,
        name: `${agent.name} Knowledge Base`,
        description: `Knowledge Base for ${agent.name}`
      });
      
      // Update agent with reference to new knowledge base
      agent.knowledgeBase = knowledgeBase._id;
      await agent.save();
    }
    
    // Add new entry
    const updatedKnowledgeBase = await knowledgeBase.addEntry(title, content);
    
    // Get the newly added entry
    const newEntry = updatedKnowledgeBase.entries[updatedKnowledgeBase.entries.length - 1];
    
    // Log activity
    await logAgentActivity(
      agent._id,
      req.user._id,
      'knowledge_add',
      `Added knowledge entry: ${title}`,
      { entryId: newEntry.id, title, contentLength: content.length }
    );
    
    return res.status(201).json({ 
      message: 'Knowledge entry added successfully',
      entry: {
        id: newEntry.id,
        title: newEntry.title,
        content: newEntry.content,
        createdAt: newEntry.createdAt,
        updatedAt: newEntry.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error adding knowledge entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update knowledge entry
 * @route   PUT /api/agents/:id/knowledge/:entryId
 * @access  Private
 */
const updateAgentKnowledge = async (req, res) => {
  try {
    const { title, content } = req.body;
    const { id, entryId } = req.params;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    const agent = await Agent.findOne({ id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check ownership
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }
    
    if (!agent.knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found for this agent' });
    }
    
    const knowledgeBase = await KnowledgeBase.findById(agent.knowledgeBase);
    
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }
    
    // Update the entry
    const updatedKnowledgeBase = await knowledgeBase.updateEntry(entryId, title, content);
    
    if (!updatedKnowledgeBase) {
      return res.status(404).json({ message: 'Knowledge entry not found' });
    }
    
    // Get the updated entry
    const updatedEntry = updatedKnowledgeBase.entries.find(entry => entry.id === entryId);
    
    // Log activity
    await logAgentActivity(
      agent._id,
      req.user._id,
      'knowledge_update',
      `Updated knowledge entry: ${title}`,
      { entryId, title, contentLength: content.length }
    );
    
    return res.json({ 
      message: 'Knowledge entry updated successfully',
      entry: {
        id: updatedEntry.id,
        title: updatedEntry.title,
        content: updatedEntry.content,
        createdAt: updatedEntry.createdAt,
        updatedAt: updatedEntry.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error updating knowledge entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete knowledge entry
 * @route   DELETE /api/agents/:id/knowledge/:entryId
 * @access  Private
 */
const deleteAgentKnowledge = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    
    const agent = await Agent.findOne({ id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check ownership
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }
    
    if (!agent.knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found for this agent' });
    }
    
    const knowledgeBase = await KnowledgeBase.findById(agent.knowledgeBase);
    
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }
    
    // Get the entry title before deleting for the log
    const entry = knowledgeBase.getEntry(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Knowledge entry not found' });
    }
    
    const entryTitle = entry.title;
    
    // Delete the entry
    const updatedKnowledgeBase = await knowledgeBase.deleteEntry(entryId);
    
    if (!updatedKnowledgeBase) {
      return res.status(404).json({ message: 'Knowledge entry not found' });
    }
    
    // Log activity
    await logAgentActivity(
      agent._id,
      req.user._id,
      'knowledge_delete',
      `Deleted knowledge entry: ${entryTitle}`,
      { entryId }
    );
    
    return res.json({ message: 'Knowledge entry deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting knowledge entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
}; 