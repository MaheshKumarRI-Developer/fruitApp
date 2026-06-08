const { getEmbedding } = require("../../knowledge_layer/services/embedding-service");
const { searchPoints } = require("../../retrival_layer/qdrant/retrieve");
const { buildContext } = require("../../retrival_layer/services/context-builder");
const { buildPrompt } = require("../services/prompt-builder");
const { generateAnswer } = require("../services/groq-service");

async function main() {
  try {
    const question = "Which fruits contain Vitamin C?";
    console.log(`Question: ${question}`);

    console.log("Generating query embedding...");
    const queryVector = await getEmbedding(question);

    console.log("Searching knowledge base...");
    const results = await searchPoints("fruits_knowledge_base", queryVector, 3);

    console.log("Building context...");
    const context = buildContext(results);

    console.log("Building prompt...");
    const prompt = buildPrompt(question, context);

    console.log("Generating answer from Groq...");
    const answer = await generateAnswer(prompt);

    console.log("\nAnswer:");
    console.log(answer);
  } catch (error) {
    console.error("RAG pipeline execution failed:", error);
  }
}

main();