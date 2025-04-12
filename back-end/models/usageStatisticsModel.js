const mongoose = require('mongoose');

const usageStatisticsSchema = mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true
    },
    totalRequests: {
      type: Number,
      default: 0
    },
    successfulRequests: {
      type: Number,
      default: 0
    },
    failedRequests: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    uniqueUsers: {
      type: Number,
      default: 0
    },
    activeAgents: {
      type: Number,
      default: 0
    },
    totalAgents: {
      type: Number,
      default: 0
    },
    platformDistribution: {
      web: {
        type: Number,
        default: 0
      },
      mobile: {
        type: Number,
        default: 0
      },
      api: {
        type: Number,
        default: 0
      }
    },
    featureDistribution: {
      chat: {
        type: Number,
        default: 0
      },
      knowledge: {
        type: Number,
        default: 0
      },
      integration: {
        type: Number,
        default: 0
      },
      other: {
        type: Number,
        default: 0
      }
    },
    timeDistribution: {
      // Array with 24 elements representing hours of the day
      type: [Number],
      default: Array(24).fill(0)
    },
    successRate: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create index for efficient querying
usageStatisticsSchema.index({ date: -1 });

// Calculate success rate from successful and total requests
usageStatisticsSchema.pre('save', function(next) {
  if (this.totalRequests > 0) {
    this.successRate = (this.successfulRequests / this.totalRequests) * 100;
  }
  next();
});

const UsageStatistics = mongoose.model('UsageStatistics', usageStatisticsSchema);

module.exports = UsageStatistics; 