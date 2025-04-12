const mongoose = require('mongoose');

// Knowledge Entry Schema
const knowledgeEntrySchema = mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

const knowledgeBaseSchema = mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
      unique: true
    },
    entries: [knowledgeEntrySchema],
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      default: 'Knowledge Base'
    },
    description: {
      type: String,
      default: 'Agent Knowledge Base'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Method to add a new knowledge entry
knowledgeBaseSchema.methods.addEntry = async function(title, content) {
  const entryId = new mongoose.Types.ObjectId().toString();
  this.entries.push({ 
    id: entryId,
    title, 
    content 
  });
  this.updatedAt = new Date();
  return await this.save();
};

// Method to update a knowledge entry
knowledgeBaseSchema.methods.updateEntry = async function(entryId, title, content) {
  const entry = this.entries.find(entry => entry.id === entryId);
  if (!entry) return null;
  
  entry.title = title;
  entry.content = content;
  entry.updatedAt = new Date();
  this.updatedAt = new Date();
  
  return await this.save();
};

// Method to delete a knowledge entry
knowledgeBaseSchema.methods.deleteEntry = async function(entryId) {
  const entryIndex = this.entries.findIndex(entry => entry.id === entryId);
  if (entryIndex === -1) return null;
  
  this.entries.splice(entryIndex, 1);
  this.updatedAt = new Date();
  
  return await this.save();
};

// Method to get all entries
knowledgeBaseSchema.methods.getAllEntries = function() {
  return this.entries;
};

// Method to get a specific entry
knowledgeBaseSchema.methods.getEntry = function(entryId) {
  return this.entries.find(entry => entry.id === entryId);
};

// Method to search entries
knowledgeBaseSchema.methods.searchEntries = function(query) {
  const searchRegex = new RegExp(query, 'i');
  return this.entries.filter(entry => 
    searchRegex.test(entry.title) || searchRegex.test(entry.content)
  );
};

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

module.exports = KnowledgeBase; 