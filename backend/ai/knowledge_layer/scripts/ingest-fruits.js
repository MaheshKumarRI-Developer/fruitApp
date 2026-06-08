const fs = require("fs");
const path = require("path");
const { buildDocument } = require("../services/document-builder");
const { getEmbedding } = require("../services/embedding-service");
const { buildPoint } = require("../services/qdrant-point-builder");
const { upsertPoints } = require("../qdrant/upsert");

async function main() {
  try {
    const datasetPath = path.join(__dirname, "../../../../25_fruits_rag_dataset.json");
    if (!fs.existsSync(datasetPath)) {
      throw new Error(`Dataset not found at ${datasetPath}`);
    }
    const fruits = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

    console.log(`Loaded ${fruits.length} fruits from dataset.`);
    const points = [];

    for (let i = 0; i < fruits.length; i++) {
      const fruit = fruits[i];
      const docText = buildDocument(fruit);
      console.log(`[${i + 1}/${fruits.length}] Embedding ${fruit.fruit}...`);
      const vector = await getEmbedding(docText);

      const point = buildPoint(i + 1, vector, {
        ...fruit,
        document_text: docText
      });
      points.push(point);
    }

    console.log("Upserting points to Qdrant...");
    await upsertPoints("fruits_knowledge_base", points);
    console.log("Ingestion completed successfully!");
  } catch (error) {
    console.error("Ingestion failed:", error);
  }
}

main();
