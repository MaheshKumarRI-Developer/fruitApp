const { getEmbedding } = require("../../knowledge_layer/services/embedding-service");
const { searchPoints } = require("../qdrant/retrieve");

async function testRetrieval(queryText) {
  try {
    console.log(`Query: "${queryText}"`);
    console.log("Generating query embedding...");
    const queryVector = await getEmbedding(queryText);
    
    console.log("Searching Qdrant collection 'fruits_knowledge_base'...");
    const results = await searchPoints("fruits_knowledge_base", queryVector, 3);
    
    console.log("\nResults:");
    results.forEach((match, index) => {
      console.log(`\n[Match ${index + 1}] Score: ${match.score}`);
      console.log(`Fruit: ${match.payload?.fruit}`);
      console.log(`Text:\n${match.payload?.document_text}`);
    });
  } catch (error) {
    console.error("Retrieval test failed:", error);
  }
}

// Default test query
const query = process.argv[2] || "Which fruit contains beta-carotene and citric acid?";
testRetrieval(query);
