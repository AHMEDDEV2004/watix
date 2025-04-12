# Gemini AI Integration Guide

This guide explains how to set up and use the Google Gemini AI integration with your agents.

## Overview

Our platform now supports the Google Gemini models in the following configurations:

- **WhatCo-Small**: Maps to Gemini 2.0 Flash
- **WhatCo-Large**: Maps to Gemini 1.5 Pro
- **Gemini Pro**: Maps to Gemini 1.5 Pro

## Credit Usage

Each model requires a different amount of credits:

| Model | Credit Cost per Request |
|-------|------------------------|
| WhatCo-Small (Gemini 2.0 Flash) | 1 credit |
| WhatCo-Large (Gemini 1.5 Pro) | 2 credits |
| Gemini Pro (Gemini 1.5 Pro) | 2 credits |

## Setup

The platform comes preconfigured with a Gemini API key, but you can also use your own:

1. **Get an API Key (Optional)**: 
   - Visit the [Google AI Studio](https://makersuite.google.com/app/apikey) to create a Gemini API key
   - Create or sign in to your Google account
   - Accept the terms of service
   - Click on "Create API Key" and copy your new API key

2. **Add API Key to Environment Variables (Optional)**:
   - In your back-end `.env` file, add your Gemini API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key
     ```

3. **Restart the Server**:
   - Restart your back-end server if you've updated the API key

## Using Gemini with Your Agents

### Creating a Gemini-Powered Agent

1. Navigate to the Agent Editor or Create Agent page
2. In the "AI System Configuration" tab, select one of the available models:
   - WhatCo-Small (Gemini 2.0 Flash) - Fast and efficient
   - WhatCo-Large (Gemini 1.5 Pro) - More powerful but consumes more credits
   - Gemini Pro (Gemini 1.5 Pro) - Same as WhatCo-Large
3. Configure your prompts, tools, and other settings as usual
4. Save your agent

### Configuration Options

The Gemini integration supports the following configuration parameters:

- **Temperature**: Controls randomness (0.0 to 1.0)
- **Top-K**: Limits token selection to the top K tokens (1 to 100)
- **System Prompt**: Instructions that define your agent's behavior

### Best Practices

For optimal results with Gemini:

1. **Clear System Prompts**: Be clear and specific in your system prompts to guide the model effectively
2. **Appropriate Temperature**: Use lower temperature (0.1-0.4) for factual tasks and higher (0.6-0.9) for creative tasks
3. **Test Different Settings**: Experiment with different combinations of temperature and top-K to find what works best for your use case
4. **Model Selection**: Use WhatCo-Small for simpler tasks to conserve credits, and WhatCo-Large for more complex tasks

### Credit Management

- Monitor your credit usage in the sidebar
- Free plan users have a limited number of credits per month
- When you run out of credits, you'll need to wait for the monthly reset or upgrade your plan

### Limitations

- The maximum context length may differ between models
- Gemini 2.0 Flash (WhatCo-Small) is faster but may be less accurate for complex tasks
- Gemini 1.5 Pro (WhatCo-Large/Gemini Pro) provides better results but uses more credits

## Troubleshooting

If you encounter issues:

1. **Check Credits**: Verify you have enough credits for the model you're using
2. **Review Logs**: Check the server logs for error messages related to the Gemini API
3. **API Limits**: Be aware of Google's API rate limits if you're making many requests

For further assistance, please contact our support team.

## API Reference

For more details on the Gemini API capabilities and parameters, see the [official Google Gemini API documentation](https://ai.google.dev/docs/gemini_api_overview). 