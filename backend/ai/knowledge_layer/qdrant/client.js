const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const { QdrantClient } = require("@qdrant/js-client-rest");

const qdrantUrl = process.env.QDRANT_URL || "http://127.0.0.1:6333";
const client = new QdrantClient({ url: qdrantUrl });

module.exports = client;
