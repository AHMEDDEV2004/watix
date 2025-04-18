# WHATCO SAAS Platform

WHATCO is a SaaS platform for creating, managing, and deploying AI agents powered by Gemini models.

## Features

### AI Agents
- Create and manage AI agents with different models (whatco-small, whatco-large, gemini-pro)
- Configure system prompts, tools, and variables
- Monitor agent performance and activities

### Knowledge Base
The platform includes a Knowledge Base feature that allows agents to access specific information when responding to queries.

#### How Knowledge Base Works:
1. **Adding Knowledge**: Users can add titled text entries to an agent's Knowledge Base.
2. **Utilizing Knowledge**: When users interact with the agent, the Knowledge Base content is incorporated into the AI system prompt.
3. **Contextual Responses**: The agent uses this knowledge to provide more accurate and contextual responses.

#### Technical Implementation:
- Knowledge Base entries are stored with title and content fields
- API endpoints for creating, reading, updating, and deleting knowledge entries
- Integration with Gemini API to include knowledge in the system prompt
- The Knowledge Base uses a MongoDB schema with subdocuments for entries

#### Benefits:
- Provide agents with domain-specific knowledge
- Ensure consistent responses about specific topics
- Reduce hallucinations by grounding the AI in factual information
- Organize information with titled entries for better context

## Technical Stack

### Frontend
- React
- React Router
- CSS
- Axios for API requests

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT for authentication

### AI Integration
- Google Gemini API (2.0 Flash and 1.5 Pro)

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB
- Gemini API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-repo/whatco-saas.git
cd whatco-saas
```

2. Install dependencies
```bash
# Install backend dependencies
cd back-end
npm install

# Install frontend dependencies
cd ../front
npm install
```

3. Configure environment variables
```bash
# In the back-end directory, create a .env file based on .env.example
# Add your MongoDB connection string and Gemini API key
```

4. Start the servers
```bash
# Start backend (from back-end directory)
npm start

# Start frontend (from front directory)
npm start
```

## Usage

1. Register an account or log in
2. Create a new agent with your desired configuration
3. Add knowledge entries to enhance your agent's capabilities
4. Test your agent in the Test tab
5. Deploy your agent when ready

## License

This project is licensed under the MIT License - see the LICENSE file for details. #   w a t i x  
 