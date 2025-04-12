const mongoose = require('mongoose');

const subscriptionSchema = mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
      enum: ['Free', 'Basic', 'Premium', 'Enterprise'],
      default: 'Free'
    },
    price: {
      type: Number,
      required: true
    },
    messageLimit: {
      type: Number,
      required: true
    },
    features: [{
      type: String
    }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: () => new Date(new Date().setMonth(new Date().getMonth() + 1))
    },
    isActive: {
      type: Boolean,
      default: true
    },
    paymentMethod: {
      type: String,
      enum: ['creditCard', 'paypal', 'bankTransfer', 'free'],
      default: 'free'
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  }
);

// Method to upgrade plan
subscriptionSchema.methods.upgradePlan = async function(newPlanName) {
  const plans = {
    'Free': { price: 0, messageLimit: 100 },
    'Basic': { price: 9.99, messageLimit: 1000 },
    'Premium': { price: 29.99, messageLimit: 10000 },
    'Enterprise': { price: 99.99, messageLimit: 100000 }
  };
  
  if (!plans[newPlanName]) {
    throw new Error('Invalid plan name');
  }
  
  this.planName = newPlanName;
  this.price = plans[newPlanName].price;
  this.messageLimit = plans[newPlanName].messageLimit;
  this.startDate = new Date();
  this.endDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
  
  return await this.save();
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 