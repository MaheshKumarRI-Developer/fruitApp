require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { generateFruitData } = require('./ai/AI_foundation/providers/index.js');
const { validateFruitResponse } = require('./ai/AI_foundation/validate/validate.js');

const app = express();

// CORS configuration — must be before all routes
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200  // Some legacy browsers choke on 204
};
app.use(cors(corsOptions));

// Explicitly handle preflight OPTIONS for all routes (required for Express 5)
app.options('/{*splat}', cors(corsOptions));

app.use(express.json());

// Health-check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'FruitApp Backend is running' });
});

const PORT = process.env.PORT || 5000;

app.post('/api/ask', async (req, res) => {
  try {
    const { question, ragEnabled = false } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    let responseData;

    if (ragEnabled) {
      const { getEmbedding } = require('./ai/knowledge_layer/services/embedding-service.js');
      const { searchPoints } = require('./ai/retrival_layer/qdrant/retrieve.js');
      const { buildContext } = require('./ai/retrival_layer/services/context-builder.js');
      const { buildPrompt } = require('./ai/generation_layer/services/prompt-builder.js');
      const { generateAnswer } = require('./ai/generation_layer/services/groq-service.js');

      console.log('[TRACE] RAG pipeline started');
      const queryVector = await getEmbedding(question);
      const results = await searchPoints('fruits_knowledge_base', queryVector, 3);
      const context = buildContext(results);
      const prompt = buildPrompt(question, context);
      const textAnswer = await generateAnswer(prompt);
      
      console.log('[TRACE] RAG pipeline completed successfully');
      responseData = { text: textAnswer, ragEnabled: true };
    } else {
      const rawResponse = await generateFruitData(question);
      console.log('[TRACE] generateFruitData completed successfully');
      
      const validatedData = validateFruitResponse(rawResponse);
      console.log('[TRACE] validateFruitResponse completed successfully');
      responseData = { ...validatedData, ragEnabled: false };
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error processing request:', error.message);
    
    let errorMessage = 'Failed to process the question';
    const msgLower = error.message ? error.message.toLowerCase() : '';
    
    if (msgLower.includes('quota') || msgLower.includes('rate_limit') || msgLower.includes('too many requests') || msgLower.includes('429')) {
      errorMessage = 'API Quota/Rate Limit Exceeded. Please change the model or check your API key.';
    }

    res.status(500).json({ error: errorMessage, details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
