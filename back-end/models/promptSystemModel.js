const mongoose = require('mongoose');

const promptSystemSchema = mongoose.Schema(
  {
    prompts: [{
      name: String,
      content: String,
      order: Number,
      conditions: [{
        variable: String,
        operator: {
          type: String,
          enum: ['equals', 'contains', 'greaterThan', 'lessThan', 'exists', 'notExists'],
          default: 'equals'
        },
        value: String
      }]
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

// Method to generate a prompt based on variables and context
promptSystemSchema.methods.generatePrompt = function(variables = {}) {
  console.log(`Generating prompt with variables:`, variables);
  
  // If it's a pathway prompt system, find the appropriate prompt based on conditions
  if (this.prompts.length > 1) {
    const matchingPrompts = this.prompts
      .filter(prompt => {
        if (!prompt.conditions || prompt.conditions.length === 0) {
          return true; // Default prompt with no conditions
        }
        
        return prompt.conditions.every(condition => {
          const variableValue = variables[condition.variable];
          
          if (!variableValue && condition.operator !== 'notExists') {
            return false;
          }
          
          switch (condition.operator) {
            case 'equals':
              return variableValue === condition.value;
            case 'contains':
              return variableValue.includes(condition.value);
            case 'greaterThan':
              return parseFloat(variableValue) > parseFloat(condition.value);
            case 'lessThan':
              return parseFloat(variableValue) < parseFloat(condition.value);
            case 'exists':
              return variableValue !== undefined && variableValue !== null;
            case 'notExists':
              return variableValue === undefined || variableValue === null;
            default:
              return false;
          }
        });
      })
      .sort((a, b) => a.order - b.order);
    
    if (matchingPrompts.length > 0) {
      return matchingPrompts[0].content;
    }
  }
  
  // If it's a single prompt or no conditions matched, return the first prompt
  return this.prompts[0]?.content || '';
};

const PromptSystem = mongoose.model('PromptSystem', promptSystemSchema);

module.exports = PromptSystem; 