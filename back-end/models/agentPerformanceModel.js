const mongoose = require('mongoose');

const agentPerformanceSchema = mongoose.Schema(
  {
    agentId: {
      type: String,
      required: true,
      ref: 'Agent',
      index: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    totalResponses: {
      type: Number,
      default: 0
    },
    successfulResponses: {
      type: Number,
      default: 0
    },
    failedResponses: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    },
    tokenUsage: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for efficient querying
agentPerformanceSchema.index({ agentId: 1, date: -1 });

const AgentPerformance = mongoose.model('AgentPerformance', agentPerformanceSchema);

module.exports = AgentPerformance; 