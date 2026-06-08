const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const axios = require("axios");

async function getEmbedding(text) {
  const url = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000/embed";
  const response = await axios.post(
    url,
    {
      text
    }
  );

  return response.data.embedding;
}

module.exports = {
  getEmbedding
};
