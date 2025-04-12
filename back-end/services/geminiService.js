const axios = require('axios');
const dotenv = require('dotenv');
const KnowledgeBase = require('../models/knowledgeBaseModel');

dotenv.config();

// Use the provided Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDFhBlYaw6yKaEmJZw6Ooua65b8by5pziA';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Initialize Gemini API client
const geminiClient = axios.create({
  baseURL: GEMINI_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Map internal model names to Gemini model names
 * @param {string} internalModel - Our internal model name (whatco-small, whatco-large, or gemini-pro)
 * @returns {string} Actual Gemini model name
 */
const mapToGeminiModel = (internalModel) => {
  switch (internalModel) {
    case 'whatco-small':
      return 'gemini-2.0-flash';
    case 'whatco-large':
      return 'gemini-1.5-pro';
    case 'gemini-pro':
      return 'gemini-1.5-pro';
    default:
      return 'gemini-1.5-pro';
  }
};

/**
 * Generate text with Gemini AI
 * @param {string} prompt - The user input prompt
 * @param {string} systemPrompt - System instructions
 * @param {string} model - Model name, e.g., 'gemini-pro'
 * @param {number} temperature - Temperature for generation (0-1)
 * @param {number} maxTokens - Maximum tokens to generate
 * @param {number} topK - Top K parameter for sampling
 * @param {Array} history - Chat history for context
 * @returns {Promise<Object>} - The response object
 */
const generateText = async (
  prompt, 
  systemPrompt = "", 
  model = "gemini-1.5-pro", 
  temperature = 0.7,
  maxTokens = 1000,
  topK = 40,
  history = []
) => {
  try {
    console.log(`Generating text with model: ${model}`);
    
    // Format the history for Gemini API
    const formattedHistory = history.map(msg => ({
      role: msg.role, // 'user' or 'model'
      parts: [{ text: msg.content }]
    }));

    // Special handling for Gemini 2.0 models which don't support system role
    let finalPrompt = prompt;
    let payload;
    
    if (model.startsWith('gemini-2.0')) {
      // For Gemini 2.0, prepend the system prompt to the user query if provided
      if (systemPrompt) {
        finalPrompt = `${systemPrompt}\n\nUser Query: ${prompt}`;
      }
      
      // Gemini 2.0 model format
      payload = {
        contents: [
          // Add chat history
          ...formattedHistory,
          // Add the current user prompt (with system prompt prepended if any)
          {
            role: 'user',
            parts: [{ text: finalPrompt }]
          }
        ],
        generation_config: {
          temperature,
          max_output_tokens: maxTokens,
          top_k: topK,
        },
      };
    } else {
      // Gemini 1.5 model format which supports system role
      payload = {
        contents: [
          // Add system prompt if provided
          ...(systemPrompt ? [{ 
            role: 'system',
            parts: [{ text: systemPrompt }] 
          }] : []),
          // Add chat history
          ...formattedHistory,
          // Add the current user prompt
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topK,
        },
      };
    }

    // Make API request to Gemini
    const response = await geminiClient.post(
      `/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      payload
    );

    // Extract and structure the response
    const result = response.data;
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usageMetrics = {
      promptTokens: result.usageMetadata?.promptTokenCount || 0,
      candidateTokens: result.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: result.usageMetadata?.totalTokenCount || 0,
    };

    return {
      success: true,
      text: generatedText,
      model: model,
      usage: usageMetrics,
    };
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      model: model,
    };
  }
};

/**
 * Process an agent request using Gemini
 * @param {Object} agent - The agent object
 * @param {Object} requestData - The request data
 * @returns {Promise<Object>} - The response object
 */
const processAgentRequest = async (agent, requestData) => {
  try {
    console.log(`Processing request with Gemini for agent ${agent.name}`);
    
    // Start the timer to measure processing time
    const startTime = Date.now();
    
    // Map our agent model to the correct Gemini model
    const geminiModel = mapToGeminiModel(agent.aiModel);
    console.log(`Using Gemini model: ${geminiModel} (mapped from ${agent.aiModel})`);
    
    // Fetch knowledge base entries if available
    let knowledgeBaseContent = '';
    if (agent.knowledgeBase) {
      try {
        const knowledgeBase = await KnowledgeBase.findById(agent.knowledgeBase);
        if (knowledgeBase && knowledgeBase.entries && knowledgeBase.entries.length > 0) {
          knowledgeBaseContent = "\n\nKNOWLEDGE BASE INFORMATION:\n";
          knowledgeBase.entries.forEach((entry, index) => {
            knowledgeBaseContent += `[${index + 1}] ${entry.title}:\n${entry.content}\n\n`;
          });
        }
      } catch (error) {
        console.error('Error fetching knowledge base:', error);
        // Continue without knowledge base if there's an error
      }
    }
    
    // Combine system prompt with knowledge base content
    let enhancedSystemPrompt = agent.promptSystem || '';
    if (knowledgeBaseContent) {
      enhancedSystemPrompt += "\n\n" + knowledgeBaseContent;
      
      // Add instructions for using the knowledge base
      enhancedSystemPrompt += "\nUse the information from the KNOWLEDGE BASE when relevant to answer user queries. If the answer isn't in the knowledge base, respond based on your general knowledge but make it clear when you're doing so.";
    }
    
    // Get the result from Gemini
    const result = await generateText(
      requestData.query,
      enhancedSystemPrompt,
      geminiModel,
      agent.temperature,
      agent.maxTokens,
      agent.topK,
      requestData.history || []
    );
    
    // Calculate actual response time
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000;
    
    if (result.success) {
      return {
        success: true,
        response: result.text,
        responseTime,
        tokenUsage: result.usage.totalTokens,
        model: result.model,
        timestamp: new Date()
      };
    } else {
      return {
        success: false,
        response: `I'm sorry, I couldn't process your request at this time.`,
        error: result.error,
        responseTime,
        model: result.model,
        timestamp: new Date()
      };
    }
  } catch (error) {
    console.error('Error in Gemini processAgentRequest:', error);
    return {
      success: false,
      response: "I'm sorry, an error occurred while processing your request.",
      error: error.message,
      timestamp: new Date()
    };
  }
};

module.exports = {
  generateText,
  processAgentRequest
}; 