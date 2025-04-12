const mongoose = require('mongoose');

const agentSchema = mongoose.Schema(
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
    aiModel: {
      type: String,
      required: true,
      enum: ['whatco-small', 'whatco-large', 'gemini-pro'],
      default: 'whatco-small'
    },
    promptSystem: {
      type: String,
      required: true
    },
    firstMessage: {
      type: String,
      default: "Hello! How can I assist you today?"
    },
    knowledgeBase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeBase'
    },
    tools: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tool'
    }],
    extractedVariables: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExtractVariableSystem'
    },
    fineTuningExamples: [{
      type: String
    }],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'paused'],
      default: 'inactive'
    },
    category: {
      type: String,
      default: 'general'
    },
    type: {
      type: String,
      enum: ['single', 'pathway'],
      default: 'single'
    },
    description: {
      type: String,
      required: true
    },
    responses: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    // Media processing capabilities
    processAudio: {
      type: Boolean,
      default: false
    },
    processVideo: {
      type: Boolean,
      default: false
    },
    processImages: {
      type: Boolean,
      default: false
    },
    processFiles: {
      type: Boolean,
      default: false
    },
    // Advanced configuration
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    maxTokens: {
      type: Number,
      default: 1000,
      min: 100,
      max: 8000
    },
    topK: {
      type: Number,
      default: 40,
      min: 1,
      max: 100
    },
    extractVariables: {
      type: Boolean,
      default: false
    },
    variables: [{
      name: String,
      type: {
        type: String,
        enum: ['string', 'number', 'date', 'boolean', 'email', 'phone'],
        default: 'string'
      },
      required: {
        type: Boolean,
        default: false
      }
    }],
    // Integration settings
    enableWebhook: {
      type: Boolean,
      default: false
    },
    enableLogging: {
      type: Boolean,
      default: false
    }
  }
);

// Method to process a request
agentSchema.methods.processRequest = async function(requestData) {
  try {
    console.log(`Processing request with agent ${this.name}`);
    
    // Start the timer to measure processing time
    const startTime = Date.now();
    
    // Simulate different behaviors based on model type
    // WhatCoLLM-Large is more accurate but slower
    const isLargeModel = this.aiModel === 'whatco-large';
    
    // Success rate and processing time based on model
    let success = Math.random() > (isLargeModel ? 0.05 : 0.15); // 95% vs 85% success rate
    let tokenUsage = Math.floor(Math.random() * 500) + 100; // Between 100 and 600 tokens
    
    // Add some random delay to simulate processing time 
    // Large model: 1-3 seconds, Small model: 0.5-2 seconds
    const minDelay = isLargeModel ? 1000 : 500;
    const maxDelay = isLargeModel ? 3000 : 2000;
    const simulatedDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
    
    await new Promise(resolve => setTimeout(resolve, simulatedDelay));
    
    // If this is a real request, update agent stats
    this.responses += 1;
    this.lastActive = new Date();
    
    // Update the accuracy based on success
    // In a real system this would be determined by user feedback
    if (this.responses === 1) {
      this.accuracy = success ? 100 : 0;
    } else {
      this.accuracy = ((this.accuracy * (this.responses - 1)) + (success ? 100 : 0)) / this.responses;
    }
    
    await this.save();
    
    // Calculate actual response time
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000;
    
    // Format the model name display for output
    const modelDisplayName = this.aiModel === 'whatco-small' ? 'WhatCoLLM-Small' : 'WhatCoLLM-Large';
    
    // Consider the conversation history if provided
    const historyText = requestData.history && requestData.history.length > 0 
      ? " (with conversation context)" 
      : "";
    
    if (success) {
      return {
        success: true,
        response: `Response from ${this.name} agent (using ${modelDisplayName})${historyText}: I processed your request about "${requestData.query}"`,
        responseTime,
        tokenUsage,
        model: this.aiModel,
        timestamp: new Date()
      };
    } else {
      return {
        success: false,
        response: `I'm sorry, I couldn't process your request about "${requestData.query}" at this time.`,
        error: 'Processing error occurred',
        responseTime,
        model: this.aiModel,
        tokenUsage: Math.floor(tokenUsage / 2), // Usually fewer tokens used when there's an error
        timestamp: new Date()
      };
    }
  } catch (error) {
    console.error('Error in processRequest:', error);
    return {
      success: false,
      response: "I'm sorry, an error occurred while processing your request.",
      error: error.message,
      model: this.aiModel,
      timestamp: new Date()
    };
  }
};

// Method to update the knowledge base
agentSchema.methods.updateKnowledgeBase = async function(knowledgeBaseId) {
  this.knowledgeBase = knowledgeBaseId;
  return await this.save();
};

// Method to add a tool
agentSchema.methods.addTool = async function(toolId) {
  if (!this.tools.includes(toolId)) {
    this.tools.push(toolId);
    return await this.save();
  }
  return this;
};

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent; 