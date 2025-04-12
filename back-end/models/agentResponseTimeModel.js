const mongoose = require('mongoose');

const agentResponseTimeSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  responseTime: {
    type: Number,  // in milliseconds
    required: true
  },
  requestLength: {
    type: Number,  // message length in characters
    required: true
  },
  responseLength: {
    type: Number,  // response length in characters
    required: true
  },
  modelUsed: {
    type: String,  // AI model used for this response
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  }
});

// Method to calculate average response time for an agent within a time range
agentResponseTimeSchema.statics.getAverageResponseTime = async function(agentId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        agentId: mongoose.Types.ObjectId(agentId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        averageResponseTime: { $avg: '$responseTime' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { averageResponseTime: 0, count: 0 };
};

// Method to get response times for an agent by timeframe (day, week, month)
agentResponseTimeSchema.statics.getResponseTimesByTimeframe = async function(agentId, timeframe) {
  const now = new Date();
  let startDate;
  
  switch(timeframe) {
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
  }
  
  const endDate = new Date(now);
  
  // Determine the interval for grouping based on timeframe
  let intervalFormat;
  let groupByFields;
  
  if (timeframe === 'day') {
    // Group by hour for day view
    intervalFormat = '%Y-%m-%d %H:00';
    groupByFields = {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' },
      hour: { $hour: '$timestamp' }
    };
  } else if (timeframe === 'week') {
    // Group by day for week view
    intervalFormat = '%Y-%m-%d';
    groupByFields = {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' }
    };
  } else {
    // Group by day for month view
    intervalFormat = '%Y-%m-%d';
    groupByFields = {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' }
    };
  }
  
  return await this.aggregate([
    {
      $match: {
        agentId: mongoose.Types.ObjectId(agentId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: groupByFields,
        averageResponseTime: { $avg: '$responseTime' },
        count: { $sum: 1 },
        date: { $first: '$timestamp' }
      }
    },
    {
      $sort: { date: 1 }
    },
    {
      $project: {
        _id: 0,
        date: 1,
        averageResponseTime: { $divide: ['$averageResponseTime', 1000] }, // Convert to seconds
        count: 1
      }
    }
  ]);
};

const AgentResponseTime = mongoose.model('AgentResponseTime', agentResponseTimeSchema);

module.exports = AgentResponseTime; 