const client = require("./client");

async function upsertPoints(collectionName, points) {
  return await client.upsert(collectionName, {
    wait: true,
    points: points
  });
}

module.exports = {
  upsertPoints
};
