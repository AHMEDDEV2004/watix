const mongoose = require('mongoose');
const crypto = require('crypto');

const apiTokenSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    lastUsed: {
      type: Date,
      default: null
    },
    isRevoked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for efficient querying
apiTokenSchema.index({ token: 1 });
apiTokenSchema.index({ userId: 1, createdAt: -1 });

// Method to generate a new token
apiTokenSchema.statics.generateToken = function(length = 32) {
  return crypto.randomBytes(length).toString('hex');
};

// Method to check if token is expired
apiTokenSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to revoke token
apiTokenSchema.methods.revoke = async function() {
  this.isRevoked = true;
  return this.save();
};

// Method to record token usage
apiTokenSchema.methods.recordUsage = async function() {
  this.lastUsed = new Date();
  return this.save();
};

const ApiToken = mongoose.model('ApiToken', apiTokenSchema);

module.exports = ApiToken; 