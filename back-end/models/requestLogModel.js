const mongoose = require('mongoose');

const requestLogSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    agentId: {
      type: String,
      ref: 'Agent',
      index: true
    },
    platform: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      required: true,
      index: true
    },
    feature: {
      type: String,
      enum: ['chat', 'knowledge', 'integration', 'other'],
      required: true,
      index: true
    },
    endpoint: {
      type: String
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      required: true
    },
    statusCode: {
      type: Number,
      required: true
    },
    responseTime: {
      type: Number, // in milliseconds
      required: true
    },
    success: {
      type: Boolean,
      default: true
    },
    errorMessage: {
      type: String
    },
    ip: {
      type: String
    },
    userAgent: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for efficient querying
requestLogSchema.index({ timestamp: -1 });
requestLogSchema.index({ userId: 1, timestamp: -1 });
requestLogSchema.index({ platform: 1, timestamp: -1 });
requestLogSchema.index({ feature: 1, timestamp: -1 });

const RequestLog = mongoose.model('RequestLog', requestLogSchema);

module.exports = RequestLog; 