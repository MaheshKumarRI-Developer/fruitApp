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
      const { buildPrompt, buildSystemPrompt } = require('./ai/generation_layer/services/prompt-builder.js');
      const { generateAnswer } = require('./ai/generation_layer/services/groq-service.js');

      console.log('[TRACE] RAG pipeline started');
      const queryVector = await getEmbedding(question);
      const results = await searchPoints('fruits_knowledge_base', queryVector, 3);
      const context = buildContext(results);

      const systemPrompt = buildSystemPrompt();
      const userPromptText = buildPrompt(question, context);

      const responseText = await generateAnswer(systemPrompt, userPromptText);
      console.log('[TRACE] RAG response text:', responseText);

      // Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        console.error('[ERROR] Failed to parse RAG response as JSON. Raw response:', responseText);
        throw new Error('Invalid JSON response from RAG LLM');
      }

      if (parsed.text) {
        // Fallback to text answer if "text" property is returned (e.g. not found)
        responseData = { text: parsed.text, ragEnabled: true };
      } else {
        // Clean and structure the RAG JSON response
        const cleaned = {
          fruit: parsed.fruit || 'RAG Analysis',
          components: Array.isArray(parsed.components) ? parsed.components.map(c => ({
            name: c.name || '',
            amount: c.amount || '',
            description: c.description || ''
          })) : [],
          vitamins: Array.isArray(parsed.vitamins) ? parsed.vitamins : [],
          minerals: Array.isArray(parsed.minerals) ? parsed.minerals : []
        };
        const validatedData = validateFruitResponse(cleaned);
        console.log('[TRACE] validateFruitResponse (RAG) completed successfully');
        responseData = { ...validatedData, ragEnabled: true };
      }
      console.log('[TRACE] RAG pipeline completed successfully');
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

// ─── Admin: Ingest knowledge base ───────────────────────────────────────────
// Call this ONCE after deployment to populate Qdrant on the server.
// POST /api/admin/ingest
// Protected by INGEST_SECRET env var (set it in Render dashboard).
app.post('/api/admin/ingest', async (req, res) => {
  const secret = process.env.INGEST_SECRET;
  if (secret && req.headers['x-ingest-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const { createCollection } = require('./ai/knowledge_layer/qdrant/collection.js');
    const { buildDocument } = require('./ai/knowledge_layer/services/document-builder.js');
    const { getEmbedding } = require('./ai/knowledge_layer/services/embedding-service.js');
    const { buildPoint } = require('./ai/knowledge_layer/services/qdrant-point-builder.js');
    const { upsertPoints } = require('./ai/knowledge_layer/qdrant/upsert.js');
    const client = require('./ai/knowledge_layer/qdrant/client.js');

    // Create collection if it doesn't exist
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === 'fruits_knowledge_base');
    if (!exists) {
      console.log('[INGEST] Creating collection fruits_knowledge_base...');
      await createCollection('fruits_knowledge_base', 384);
      console.log('[INGEST] Collection created.');
    } else {
      console.log('[INGEST] Collection already exists, upserting points...');
    }

    // Load dataset — lives in backend/ folder (same level as index.js)
    const datasetPath = path.join(__dirname, '25_fruits_rag_dataset.json');
    if (!fs.existsSync(datasetPath)) {
      return res.status(500).json({ error: `Dataset not found at ${datasetPath}` });
    }
    const fruits = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    console.log(`[INGEST] Loaded ${fruits.length} fruits. Starting embedding...`);

    const points = [];
    for (let i = 0; i < fruits.length; i++) {
      const fruit = fruits[i];
      const docText = buildDocument(fruit);
      console.log(`[INGEST] [${i + 1}/${fruits.length}] Embedding ${fruit.fruit}...`);
      const vector = await getEmbedding(docText);
      points.push(buildPoint(crypto.randomUUID(), vector, { ...fruit, document_text: docText }));
    }

    console.log('[INGEST] Upserting points to Qdrant...');
    await upsertPoints('fruits_knowledge_base', points);
    console.log('[INGEST] Ingestion completed successfully!');

    res.json({ success: true, message: `Ingested ${fruits.length} fruits into fruits_knowledge_base.` });
  } catch (error) {
    console.error('[INGEST] Error:', error.message);
    res.status(500).json({ error: 'Ingestion failed', details: error.message });
  }
});

// ─── Auto-seed on startup ────────────────────────────────────────────────────
// Runs AFTER server starts so health checks pass immediately.
// Checks if Qdrant collection is empty → seeds if needed → does nothing if full.
async function autoSeedKnowledgeBase() {
  try {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const client = require('./ai/knowledge_layer/qdrant/client.js');
    const { createCollection } = require('./ai/knowledge_layer/qdrant/collection.js');
    const { buildDocument } = require('./ai/knowledge_layer/services/document-builder.js');
    const { getEmbedding } = require('./ai/knowledge_layer/services/embedding-service.js');
    const { buildPoint } = require('./ai/knowledge_layer/services/qdrant-point-builder.js');
    const { upsertPoints } = require('./ai/knowledge_layer/qdrant/upsert.js');

    console.log('[AUTO-SEED] Checking knowledge base...');

    // Step 1: Ensure collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === 'fruits_knowledge_base');
    if (!exists) {
      console.log('[AUTO-SEED] Collection not found. Creating...');
      await createCollection('fruits_knowledge_base', 384);
    }

    // Step 2: Check if already populated
    const info = await client.getCollection('fruits_knowledge_base');
    const pointCount = info.points_count ?? 0;
    if (pointCount > 0) {
      console.log(`[AUTO-SEED] Already seeded (${pointCount} points). Skipping.`);
      return;
    }

    // Step 3: Collection is empty → ingest
    console.log('[AUTO-SEED] Collection is empty. Starting ingestion...');
    const datasetPath = path.join(__dirname, '25_fruits_rag_dataset.json');
    if (!fs.existsSync(datasetPath)) {
      console.warn(`[AUTO-SEED] Dataset not found at ${datasetPath}. Skipping.`);
      return;
    }

    const fruits = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const points = [];
    for (let i = 0; i < fruits.length; i++) {
      const fruit = fruits[i];
      const docText = buildDocument(fruit);
      console.log(`[AUTO-SEED] [${i + 1}/${fruits.length}] Embedding ${fruit.fruit}...`);
      const vector = await getEmbedding(docText);
      points.push(buildPoint(crypto.randomUUID(), vector, { ...fruit, document_text: docText }));
    }

    await upsertPoints('fruits_knowledge_base', points);
    console.log(`[AUTO-SEED] ✅ Done! Ingested ${fruits.length} fruits.`);
  } catch (err) {
    // Non-fatal — server keeps running even if seeding fails
    console.error('[AUTO-SEED] Failed (will retry on next restart):', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  // Kick off seeding in background — don't await so server starts instantly
  autoSeedKnowledgeBase();
});
