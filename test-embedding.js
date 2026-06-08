const fruits = require("./25_fruits_rag_dataset.json");

const { buildDocument } = require("./backend/ai/knowledge_layer/documents/document_builder.js");
const { getEmbedding } = require("./backend/ai/knowledge_layer/embedding_service/embedding_service.js");

async function main() {

    const document = buildDocument(
        fruits[0]
    );

    const embedding =
        await getEmbedding(document);

    console.log(
        "Dimensions:",
        embedding.length
    );
}

main();