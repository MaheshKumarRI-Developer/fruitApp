const client = require("./client");

async function createCollection(collectionName, vectorSize = 384) {
  await client.createCollection(collectionName, {
    vectors: {
      size: vectorSize,
      distance: "Cosine"
    }
  });
}

module.exports = {
  createCollection
};
