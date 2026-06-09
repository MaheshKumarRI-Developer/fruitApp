const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const axios = require("axios");

async function getEmbedding(text) {
  const url = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000/embed";
  
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

module.exports = {
  getEmbedding
};
