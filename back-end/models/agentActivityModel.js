const mongoose = require('mongoose');

const agentActivitySchema = mongoose.Schema(
  {
    agentId: {
      type: String,
      required: true,
      ref: 'Agent',
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ['update', 'config', 'status', 'interaction', 'creation', 'deletion', 'error', 'knowledge_add', 'knowledge_update', 'knowledge_delete'],
      default: 'interaction'
    },
    description: {
      type: String,
      required: true
    },
    metadata: {
      type: Object,
      default: {}
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create index for efficient querying
agentActivitySchema.index({ agentId: 1, timestamp: -1 });

const AgentActivity = mongoose.model('AgentActivity', agentActivitySchema);

module.exports = AgentActivity; 