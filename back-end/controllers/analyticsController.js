const RequestLog = require('../models/requestLogModel');
const UsageStatistics = require('../models/usageStatisticsModel');
const SystemActivity = require('../models/systemActivityModel');
const AgentActivity = require('../models/agentActivityModel');
const AgentPerformance = require('../models/agentPerformanceModel');
const Agent = require('../models/agentModel');

// Helper function to get date range based on timeframe
const getDateRange = (timeframe) => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate;

  switch (timeframe) {
    case 'day':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      // Default to last 7 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
  }

  return { startDate, endDate };
};

/**
 * @desc    Get system summary analytics
 * @route   GET /api/analytics/summary
 * @access  Private
 */
const getAnalyticsSummary = async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(timeframe);

    // Get total request count
    const totalRequests = await RequestLog.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Get successful request count
    const successfulRequests = await RequestLog.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate },
      success: true
    });

    // Calculate success rate
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    
    // Get average response time
    const responseTimeResult = await RequestLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          averageResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);
    
    const averageResponseTime = responseTimeResult.length > 0 
      ? Math.round(responseTimeResult[0].averageResponseTime) 
      : 0;

    // Get total agents count
    const totalAgents = await Agent.countDocuments({ owner: req.user._id });
    
    // Get active agents count
    const activeAgents = await Agent.countDocuments({ 
      owner: req.user._id,
      status: 'active'
    });

    // Get unique users count (for admin users only)
    let uniqueUsers = 0;
    if (req.user.isAdmin) {
      uniqueUsers = await RequestLog.distinct('userId', {
        timestamp: { $gte: startDate, $lte: endDate }
      }).countDocuments();
    }

    // Calculate error rate
    const errorRate = totalRequests > 0 ? 100 - successRate : 0;

    res.json({
      summary: {
        totalRequests,
        totalAgents,
        activeAgents,
        averageResponseTime,
        successRate: parseFloat(successRate.toFixed(1)),
        errorRate: parseFloat(errorRate.toFixed(1)),
        uniqueUsers
      },
      timeframe,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ message: 'Failed to fetch analytics summary' });
  }
};

/**
 * @desc    Get system trends analytics
 * @route   GET /api/analytics/trends
 * @access  Private
 */
const getAnalyticsTrends = async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(timeframe);
    
    // Determine the interval based on timeframe
    let interval, format, groupBy;
    
    switch(timeframe) {
      case 'day':
        interval = 'hour';
        format = '%H';
        groupBy = { $hour: '$timestamp' };
        break;
      case 'week':
        interval = 'day';
        format = '%Y-%m-%d';
        groupBy = { 
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        };
        break;
      case 'month':
      case 'quarter':
        interval = 'day';
        format = '%Y-%m-%d';
        groupBy = { 
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        };
        break;
      case 'year':
        interval = 'month';
        format = '%Y-%m';
        groupBy = { 
          $dateToString: { format: '%Y-%m', date: '$timestamp' }
        };
        break;
      default:
        interval = 'day';
        format = '%Y-%m-%d';
        groupBy = { 
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        };
    }

    // Get request trend
    const requestTrend = await RequestLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          responseTime: { $avg: '$responseTime' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Transform results into the format needed by the front-end
    const trends = {
      requests: [],
      responseTime: [],
      successRate: []
    };

    requestTrend.forEach(point => {
      trends.requests.push(point.count);
      trends.responseTime.push(Math.round(point.responseTime || 0));
      
      const successRate = point.count > 0
        ? (point.successCount / point.count) * 100
        : 0;
        
      trends.successRate.push(parseFloat(successRate.toFixed(1)));
    });

    res.json({
      trends,
      timeframe,
      interval,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('Error getting analytics trends:', error);
    res.status(500).json({ message: 'Failed to fetch analytics trends' });
  }
};

/**
 * @desc    Get agent performance analytics
 * @route   GET /api/analytics/agent-performance
 * @access  Private
 */
const getAgentPerformance = async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(timeframe);

    // Get the user's agents
    const agents = await Agent.find({ owner: req.user._id }).select('id name status');

    // Get performance data for each agent
    const agentPerformance = [];

    for (const agent of agents) {
      // Get request count
      const requests = await RequestLog.countDocuments({
        agentId: agent.id,
        timestamp: { $gte: startDate, $lte: endDate }
      });

      // Skip agents with no activity
      if (requests === 0) continue;

      // Get average response time
      const responseTimeResult = await RequestLog.aggregate([
        {
          $match: {
            agentId: agent.id,
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            averageResponseTime: { $avg: '$responseTime' }
          }
        }
      ]);

      // Get success rate
      const successfulRequests = await RequestLog.countDocuments({
        agentId: agent.id,
        timestamp: { $gte: startDate, $lte: endDate },
        success: true
      });

      const responseTime = responseTimeResult.length > 0
        ? Math.round(responseTimeResult[0].averageResponseTime)
        : 0;

      const successRate = requests > 0
        ? (successfulRequests / requests) * 100
        : 0;

      agentPerformance.push({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        requests,
        responseTime,
        successRate: parseFloat(successRate.toFixed(1))
      });
    }

    // Sort by request count (descending)
    agentPerformance.sort((a, b) => b.requests - a.requests);

    res.json({
      agentPerformance,
      timeframe,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('Error getting agent performance:', error);
    res.status(500).json({ message: 'Failed to fetch agent performance data' });
  }
};

/**
 * @desc    Get usage distribution analytics
 * @route   GET /api/analytics/usage-distribution
 * @access  Private
 */
const getUsageDistribution = async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(timeframe);

    // Get platform distribution
    const platformDistribution = await RequestLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get feature distribution
    const featureDistribution = await RequestLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$feature',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get time distribution (by hour of day)
    const timeDistribution = await RequestLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Transform to the format needed by the front-end
    const totalPlatformRequests = platformDistribution.reduce((sum, item) => sum + item.count, 0);
    const totalFeatureRequests = featureDistribution.reduce((sum, item) => sum + item.count, 0);

    // Initialize distribution objects
    const byPlatform = {
      web: 0,
      mobile: 0,
      api: 0
    };

    const byFeature = {
      chat: 0,
      knowledge: 0,
      integration: 0,
      other: 0
    };

    // Fill in platform distribution percentages
    platformDistribution.forEach(item => {
      if (totalPlatformRequests > 0) {
        byPlatform[item._id] = parseFloat(((item.count / totalPlatformRequests) * 100).toFixed(1));
      }
    });

    // Fill in feature distribution percentages
    featureDistribution.forEach(item => {
      if (totalFeatureRequests > 0) {
        byFeature[item._id] = parseFloat(((item.count / totalFeatureRequests) * 100).toFixed(1));
      }
    });

    // Fill in time distribution (by hour)
    const byTime = Array(24).fill(0);
    timeDistribution.forEach(item => {
      byTime[item._id] = item.count;
    });

    res.json({
      usageDistribution: {
        byPlatform,
        byFeature,
        byTime
      },
      timeframe,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('Error getting usage distribution:', error);
    res.status(500).json({ message: 'Failed to fetch usage distribution data' });
  }
};

/**
 * @desc    Get user activities
 * @route   GET /api/analytics/activities
 * @access  Private
 */
const getUserActivities = async (req, res) => {
  try {
    const { limit = 10, type = 'all' } = req.query;
    
    // Build the query
    const query = { userId: req.user._id };
    
    // Filter by type if specified
    if (type !== 'all') {
      query.type = type;
    }
    
    // Get activities
    const activities = await SystemActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    // Format activities for client
    const formattedActivities = activities.map(activity => activity.formatForClient());
    
    res.json(formattedActivities);
  } catch (error) {
    console.error('Error getting user activities:', error);
    res.status(500).json({ message: 'Failed to fetch user activities' });
  }
};

/**
 * @desc    Get billing activities
 * @route   GET /api/users/billing/activities
 * @access  Private
 */
const getBillingActivities = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Get billing-related activities
    const activities = await SystemActivity.find({
      userId: req.user._id,
      type: { $in: ['payment', 'subscription'] }
    })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));
    
    // Format activities for client
    const formattedActivities = activities.map(activity => activity.formatForClient());
    
    res.json(formattedActivities);
  } catch (error) {
    console.error('Error getting billing activities:', error);
    res.status(500).json({ message: 'Failed to fetch billing activities' });
  }
};

// Log a system activity
const logSystemActivity = async (userId, type, title, description, metadata = {}, ip = null, userAgent = null) => {
  try {
    const activity = new SystemActivity({
      userId,
      type,
      title,
      description,
      metadata,
      ip,
      userAgent,
      timestamp: new Date()
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging system activity:', error);
    return null;
  }
};

// Log a request
const logRequest = async (userId, agentId, platform, feature, endpoint, method, statusCode, responseTime, success, errorMessage = null, ip = null, userAgent = null) => {
  try {
    const request = new RequestLog({
      userId,
      agentId,
      platform,
      feature,
      endpoint,
      method,
      statusCode,
      responseTime,
      success,
      errorMessage,
      ip,
      userAgent,
      timestamp: new Date()
    });
    
    await request.save();
    return request;
  } catch (error) {
    console.error('Error logging request:', error);
    return null;
  }
};

// Middleware to log API requests
const requestLogger = async (req, res, next) => {
  // Skip logging for analytics endpoints to avoid circular logging
  if (req.path.startsWith('/api/analytics')) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Store the original end method
  const originalEnd = res.end;
  
  // Override the end method
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Restore the original end method
    res.end = originalEnd;
    
    // Call the original end method
    res.end(chunk, encoding);
    
    // Skip logging if no authenticated user
    if (!req.user) return;
    
    // Determine platform (this could be enhanced with more sophisticated detection)
    const userAgent = req.headers['user-agent'] || '';
    let platform = 'web';
    
    if (userAgent.includes('Mobile')) {
      platform = 'mobile';
    } else if (req.headers['x-api-client']) {
      platform = 'api';
    }
    
    // Determine feature based on path
    let feature = 'other';
    const path = req.path.toLowerCase();
    
    if (path.includes('/chat') || path.includes('/message')) {
      feature = 'chat';
    } else if (path.includes('/knowledge')) {
      feature = 'knowledge';
    } else if (path.includes('/webhook') || path.includes('/integration')) {
      feature = 'integration';
    }
    
    // Log the request
    const success = res.statusCode >= 200 && res.statusCode < 400;
    
    logRequest(
      req.user._id,
      req.params.id, // agentId if present
      platform,
      feature,
      req.path,
      req.method,
      res.statusCode,
      responseTime,
      success,
      success ? null : 'Request failed',
      req.ip,
      userAgent
    );
  };
  
  next();
};

module.exports = {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getAgentPerformance,
  getUsageDistribution,
  getUserActivities,
  getBillingActivities,
  logSystemActivity,
  logRequest,
  requestLogger
}; 