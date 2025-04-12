const mongoose = require('mongoose');

const extractVariableSystemSchema = mongoose.Schema(
  {
    variables: [{
      name: String,
      description: String,
      type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
        default: 'string'
      },
      required: Boolean
    }],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Method to extract variables from text
extractVariableSystemSchema.methods.extractFromText = function(text) {
  // This would contain the actual variable extraction logic
  // For now, just return a mock result
  console.log(`Extracting variables from text: ${text.substring(0, 30)}...`);
  
  let extractedVars = {};
  this.variables.forEach(variable => {
    // Simple extraction for demonstration purposes
    const regex = new RegExp(`${variable.name}[\\s:]+(.*?)(?=[\\n\\r]|$)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      extractedVars[variable.name] = match[1].trim();
    } else if (variable.required) {
      extractedVars[variable.name] = '[Not found]';
    }
  });
  
  return extractedVars;
};

// Method to extract variables from audio
extractVariableSystemSchema.methods.extractFromAudio = function(audioData) {
  // This would contain audio processing logic
  // For now, just return a mock result
  console.log(`Extracting variables from audio data`);
  
  let extractedVars = {};
  this.variables.forEach(variable => {
    extractedVars[variable.name] = `[Placeholder for ${variable.name} from audio]`;
  });
  
  return extractedVars;
};

const ExtractVariableSystem = mongoose.model('ExtractVariableSystem', extractVariableSystemSchema);

module.exports = ExtractVariableSystem; 