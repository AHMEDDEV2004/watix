const mongoose = require('mongoose');

const userCreditSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    totalCredits: {
      type: Number,
      required: true,
      default: 100 // Default credits for free plan
    },
    usedCredits: {
      type: Number,
      required: true,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create an index for efficient querying
userCreditSchema.index({ userId: 1 });

// Method to check available credits
userCreditSchema.methods.getAvailableCredits = function() {
  return this.totalCredits - this.usedCredits;
};

// Method to use credits
userCreditSchema.methods.useCredits = async function(amount = 1) {
  if (this.usedCredits + amount > this.totalCredits) {
    return false; // Not enough credits
  }
  
  this.usedCredits += amount;
  await this.save();
  return true;
};

// Method to reset credits (e.g., monthly reset)
userCreditSchema.methods.resetCredits = async function() {
  this.usedCredits = 0;
  this.lastResetDate = Date.now();
  await this.save();
  return true;
};

// Method to update total credits (when plan changes)
userCreditSchema.methods.updateTotalCredits = async function(newTotal) {
  this.totalCredits = newTotal;
  // If used credits exceed new total, cap it
  if (this.usedCredits > this.totalCredits) {
    this.usedCredits = this.totalCredits;
  }
  await this.save();
  return true;
};

const UserCredit = mongoose.model('UserCredit', userCreditSchema);

module.exports = UserCredit; 