const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    authenticationMethod: {
      type: String,
      required: true,
      default: 'email'
    },
    subscriptionPlan: {
      type: String,
      enum: ['Free', 'Basic', 'Premium'],
      default: 'Free'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to check if entered password matches the hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Login method (just verifies user credentials)
userSchema.methods.login = async function(enteredPassword) {
  const isMatch = await this.matchPassword(enteredPassword);
  return isMatch;
};

// Logout method (nothing required in the model, handled by tokens in the controller)
userSchema.methods.logout = function() {
  return true;
};

// Upgrade plan method
userSchema.methods.upgradePlan = function(newPlan) {
  if (['Free', 'Basic', 'Premium'].includes(newPlan)) {
    this.subscriptionPlan = newPlan;
    return true;
  }
  return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 