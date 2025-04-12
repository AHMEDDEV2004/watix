const mongoose = require('mongoose');

const analyticsSchema = mongoose.Schema(
  {
    totalConversations: {
      type: Number,
      default: 0
    },
    uniqueUsers: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    satisfactionScore: {
      type: Number,
      default: 0
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dateRange: {
      start: {
        type: Date,
        default: () => new Date(new Date().setDate(new Date().getDate() - 30))
      },
      end: {
        type: Date,
        default: Date.now
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Method to generate report
analyticsSchema.methods.generateReport = function() {
  // This would generate a formatted analytics report
  console.log(`Generating analytics report for agent ${this.agent}`);
  
  return {
    totalConversations: this.totalConversations,
    uniqueUsers: this.uniqueUsers,
    responseTime: `${this.responseTime}ms`,
    conversionRate: `${this.conversionRate}%`,
    satisfactionScore: this.satisfactionScore.toFixed(1),
    dateRange: {
      start: this.dateRange.start.toISOString().split('T')[0],
      end: this.dateRange.end.toISOString().split('T')[0]
    }
  };
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics; 