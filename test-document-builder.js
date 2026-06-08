const fruits = require("./25_fruits_rag_dataset.json");
const { buildDocument } = require("./backend/ai/knowledge_layer/documents/document_builder.js");

const document = buildDocument(fruits[3]);

console.log(document);
