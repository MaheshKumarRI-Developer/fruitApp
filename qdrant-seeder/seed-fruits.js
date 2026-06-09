const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { QdrantClient } = require('@qdrant/js-client-rest');

// Load environment variables from .env file
require('dotenv').config();

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL;
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'fruit_collection';
const BATCH_SIZE = 5; // Size of batches for embedding and upserting

/**
 * Validates that all necessary environment variables are set.
 */
function validateEnv() {
  const missing = [];
  if (!QDRANT_URL) missing.push('QDRANT_URL');
  if (!EMBEDDING_API_URL) missing.push('EMBEDDING_API_URL');
  
  if (missing.length > 0) {
    console.error(`[ERROR] Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please copy .env.example to .env and configure the variables.');
    process.exit(1);
  }
}

/**
 * Converts a fruit object into a descriptive, searchable text string.
 */
function buildDocumentText(fruit) {
  if (typeof fruit === 'string') return fruit;

  const parts = [];
  if (fruit.fruit) parts.push(`Fruit: ${fruit.fruit}`);
  if (fruit.description) parts.push(`Description: ${fruit.description}`);

  if (Array.isArray(fruit.components)) {
    const comps = fruit.components
      .map(c => typeof c === 'string' ? `- ${c}` : `- ${c.name || ''}: ${c.description || ''}`)
      .filter(Boolean)
      .join('\n');
    if (comps) parts.push(`Components:\n${comps}`);
  }

  if (Array.isArray(fruit.vitamins) && fruit.vitamins.length > 0) {
    parts.push(`Vitamins: ${fruit.vitamins.join(', ')}`);
  }

  if (Array.isArray(fruit.minerals) && fruit.minerals.length > 0) {
    parts.push(`Minerals: ${fruit.minerals.join(', ')}`);
  }

  if (parts.length === 0) {
    return JSON.stringify(fruit);
  }

  return parts.join('\n\n');
}

/**
 * Generates vector embeddings for a given text by calling the embedding API.
 * Supports multiple common API request/response formats.
 */
async function getEmbedding(text, url) {
  // Method 1: standard custom format (POST with { text })
  try {
    const response = await axios.post(url, { text }, { timeout: 15000 });
    if (response.data && response.data.embedding) {
      return response.data.embedding;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data[0])) {
      return response.data[0];
    }
  } catch (err) {
    // Method 2: standard Hugging Face format (POST with { inputs: text })
    try {
      const response = await axios.post(url, { inputs: text }, { timeout: 15000 });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && response.data.embedding) {
        return response.data.embedding;
      }
      if (response.data && Array.isArray(response.data[0])) {
        return response.data[0];
      }
    } catch (err2) {
      throw new Error(`Embedding request failed. Method 1 (text): ${err.message}. Method 2 (inputs): ${err2.message}`);
    }
  }
  throw new Error('Could not parse embedding vector from the API response.');
}

/**
 * Main seeding execution function.
 */
async function seed() {
  validateEnv();

  const datasetPath = path.join(__dirname, 'fruits.json');
  if (!fs.existsSync(datasetPath)) {
    console.error(`[ERROR] Data file not found at ${datasetPath}. Please make sure fruits.json is present.`);
    process.exit(1);
  }

  let fruits;
  try {
    fruits = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    if (!Array.isArray(fruits)) {
      throw new Error('Dataset root is not a JSON array.');
    }
  } catch (err) {
    console.error(`[ERROR] Failed to parse fruits.json: ${err.message}`);
    process.exit(1);
  }

  console.log(`[START] Loaded ${fruits.length} records from fruits.json.`);
  console.log(`[CONNECT] Connecting to Qdrant at: ${QDRANT_URL}`);

  const qdrantClient = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY || undefined,
    checkCompatibility: false // Prevents initial telemetry blocks in secured environments
  });

  try {
    // 1. Warm up: Get the embedding for the first fruit to determine vector dimension dynamically
    console.log('[EMBED] Generating initial embedding to determine vector dimension...');
    const firstDocText = buildDocumentText(fruits[0]);
    const firstEmbedding = await getEmbedding(firstDocText, EMBEDDING_API_URL);
    const vectorDimension = firstEmbedding.length;
    console.log(`[EMBED] Detected vector dimension size: ${vectorDimension}`);

    // 2. Collection check/creation
    console.log(`[DATABASE] Checking if collection '${COLLECTION_NAME}' exists...`);
    const collectionsRes = await qdrantClient.getCollections();
    const exists = collectionsRes.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`[DATABASE] Collection not found. Creating '${COLLECTION_NAME}' (dimension: ${vectorDimension})...`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: vectorDimension,
          distance: 'Cosine'
        }
      });
      console.log(`[DATABASE] Collection '${COLLECTION_NAME}' created successfully.`);
    } else {
      console.log(`[DATABASE] Collection '${COLLECTION_NAME}' already exists.`);
    }

    // 3. Seeding in batches
    let successCount = 0;
    const totalBatches = Math.ceil(fruits.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      const startIdx = b * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, fruits.length);
      const chunk = fruits.slice(startIdx, endIdx);

      console.log(`\n[PROGRESS] Processing batch ${b + 1}/${totalBatches} (records ${startIdx + 1} to ${endIdx})...`);

      const points = [];
      const embeddingPromises = chunk.map(async (fruit) => {
        const docText = buildDocumentText(fruit);
        try {
          const vector = await getEmbedding(docText, EMBEDDING_API_URL);
          const pointId = uuidv4();
          
          return {
            id: pointId,
            vector,
            payload: {
              ...fruit,
              document_text: docText
            }
          };
        } catch (err) {
          console.error(`  [WARN] Failed to process fruit '${fruit.fruit || 'Unknown'}': ${err.message}`);
          return null;
        }
      });

      const batchResults = await Promise.all(embeddingPromises);
      const validPoints = batchResults.filter(Boolean);

      if (validPoints.length > 0) {
        console.log(`[PROGRESS] Upserting ${validPoints.length} points to Qdrant Cloud...`);
        await qdrantClient.upsert(COLLECTION_NAME, {
          wait: true,
          points: validPoints
        });
        successCount += validPoints.length;
        console.log(`[PROGRESS] Batch ${b + 1}/${totalBatches} completed successfully.`);
      } else {
        console.log(`[PROGRESS] Batch ${b + 1}/${totalBatches} had no valid points. Skipping.`);
      }
    }

    console.log('\n=========================================');
    console.log(`[SUCCESS] Seeding complete!`);
    console.log(`- Total records read: ${fruits.length}`);
    console.log(`- Successfully upserted: ${successCount}`);
    console.log(`- Collection name: ${COLLECTION_NAME}`);
    console.log('=========================================');

  } catch (error) {
    console.error('\n[FATAL ERROR] Seeding aborted:');
    if (error.response) {
      console.error(`- HTTP Status: ${error.response.status}`);
      console.error(`- Response Data:`, JSON.stringify(error.response.data));
    } else {
      console.error(`- Message: ${error.message}`);
    }
    process.exit(1);
  }
}

// Execute the seeder
seed();
