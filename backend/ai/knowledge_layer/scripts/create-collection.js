const { createCollection } = require("../qdrant/collection");

async function main() {
  try {
    console.log("Creating collection 'fruits_knowledge_base'...");
    await createCollection("fruits_knowledge_base", 384);
    console.log("Collection created successfully!");
  } catch (error) {
    console.error("Error creating collection:", error);
  }
}

main();
