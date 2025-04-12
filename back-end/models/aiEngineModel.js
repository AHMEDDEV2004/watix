const mongoose = require('mongoose');

const aiEngineSchema = mongoose.Schema(
  {
    model: {
      type: String,
      required: true,
      enum: ['whatco-small', 'whatco-large'],
      default: 'whatco-small'
    },
    apiKey: {
      type: String,
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    settings: {
      temperature: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 1
      },
      maxTokens: {
        type: Number,
        default: 2048
      },
      topP: {
        type: Number,
        default: 1
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Method to process text
aiEngineSchema.methods.processText = async function(prompt) {
  // This would call the appropriate AI API with the provided prompt
  console.log(`Processing text with model ${this.model}`);
  
  // Format the model name display for output
  const modelDisplayName = this.model === 'whatco-small' ? 'WhatCoLLM-Small' : 'WhatCoLLM-Large';
  
  // Mock response for now
  return {
    success: true,
    text: `Response from ${modelDisplayName}: This is a simulated response to your prompt: "${prompt.substring(0, 30)}..."`
  };
};

// Method to process audio
aiEngineSchema.methods.processAudio = async function(audioData) {
  // This would call the appropriate AI API with the audio data
  console.log(`Processing audio with model ${this.model}`);
  
  // Format the model name display for output
  const modelDisplayName = this.model === 'whatco-small' ? 'WhatCoLLM-Small' : 'WhatCoLLM-Large';
  
  // Mock response for now
  return {
    success: true,
    text: `Audio transcription from ${modelDisplayName}: This is a simulated transcription of your audio.`
  };
};

// Method to process image
aiEngineSchema.methods.processImage = async function(imageData) {
  // This would call the appropriate AI API with the image data
  console.log(`Processing image with model ${this.model}`);
  
  // Format the model name display for output
  const modelDisplayName = this.model === 'whatco-small' ? 'WhatCoLLM-Small' : 'WhatCoLLM-Large';
  
  // Mock response for now
  return {
    success: true,
    text: `Image description from ${modelDisplayName}: This is a simulated description of your image.`
  };
};

const AIEngine = mongoose.model('AIEngine', aiEngineSchema);

module.exports = AIEngine; 