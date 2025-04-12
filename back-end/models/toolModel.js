const mongoose = require('mongoose');

const toolSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    function: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    parameters: [{
      name: String,
      type: String,
      description: String,
      required: Boolean
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Method to execute the tool
toolSchema.methods.execute = async function(params) {
  // This would contain the actual function execution logic
  // For now, we'll just return a simple response
  console.log(`Executing tool ${this.name} with params:`, params);
  return {
    success: true,
    result: `Result from executing ${this.name}`
  };
};

const Tool = mongoose.model('Tool', toolSchema);

module.exports = Tool; 