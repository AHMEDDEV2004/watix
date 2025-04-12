const mongoose = require('mongoose');

const systemActivitySchema = mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['login', 'logout', 'registration', 'payment', 'subscription', 'error', 'security', 'admin', 'other'],
      default: 'other'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    agentId: {
      type: String,
      ref: 'Agent',
      index: true
    },
    metadata: {
      type: Object,
      default: {}
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
systemActivitySchema.index({ type: 1, timestamp: -1 });
systemActivitySchema.index({ userId: 1, timestamp: -1 });

// Method to format the activity for client display
systemActivitySchema.methods.formatForClient = function() {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    description: this.description,
    timestamp: this.timestamp,
    metadata: this.metadata
  };
};

const SystemActivity = mongoose.model('SystemActivity', systemActivitySchema);

module.exports = SystemActivity; 