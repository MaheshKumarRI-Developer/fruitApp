const client = require("../../knowledge_layer/qdrant/client");

async function searchPoints(collectionName, vector, limit = 3) {
  return await client.search(collectionName, {
    vector: vector,
    limit: limit,
    with_payload: true
  });
}

module.exports = {
  searchPoints
};
