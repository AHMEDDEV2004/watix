const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: String,
      required: true // Can be a user ID or an agent ID
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    messageType: {
      type: String,
      enum: ['text', 'audio', 'image', 'file'],
      default: 'text'
    },
    metadata: {
      type: Map,
      of: String,
      default: new Map()
    },
    isRead: {
      type: Boolean,
      default: false
    },
    conversationId: {
      type: String
    }
  }
);

// Method to analyze message
messageSchema.methods.analyzeMessage = function() {
  // This would analyze the message content for sentiment, keywords, etc.
  console.log(`Analyzing message: ${this.content.substring(0, 30)}...`);
  
  // Mock analysis for now
  return {
    sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
    keywords: this.content.split(' ').filter(word => word.length > 5).slice(0, 3),
    wordCount: this.content.split(' ').length
  };
};

// Method to respond to message
messageSchema.methods.respondMessage = async function(response) {
  // This would create a new message as a response
  console.log(`Creating response to message ID ${this.id}`);
  
  const responseMessage = new this.constructor({
    id: `MSG_${Date.now()}`,
    sender: this.receiver, // The receiver becomes the sender
    receiver: this.sender, // The sender becomes the receiver
    content: response,
    messageType: 'text',
    conversationId: this.conversationId
  });
  
  return await responseMessage.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 