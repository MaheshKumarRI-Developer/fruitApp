require('dotenv').config();
const OpenAI = require('openai');
const { systemPrompt, userPrompt } = require('../prompts/index.js');

// Groq client using OpenAI-compatible interface
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const generateFruitData = async (question) => {
  const model = process.env.GROQ_MODEL || 'llama3-70b-8192';

  const completion = await groqClient.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt(question)
      }
    ],
    model,
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  });

  const finishReason = completion.choices[0]?.finish_reason;
  let content = completion.choices[0]?.message?.content || '';

  if (!content || finishReason === 'length') {
    throw new Error(`Model "${model}" returned empty content. Finish reason: ${finishReason}.`);
  }

  const { parseLLMResponse } = require('../parsers/index.js');
  const parsedContent = parseLLMResponse(content);
  
  console.log('[TRACE] generateFruitData parsing completed');
  return parsedContent;
};

module.exports = {
  generateFruitData
};
