const { getEmbedding } =
    require("../../knowledge_layer/services/embedding-service");

const { searchPoints } =
    require("../qdrant/retrieve");

const { buildContext } =
    require("../services/context-builder");

async function main() {

    const query =
        "Which fruits contain Vitamin C?";

    const queryVector =
        await getEmbedding(query);

    const results =
        await searchPoints(
            "fruits_knowledge_base",
            queryVector,
            3
        );

    const context =
        buildContext(results);

    console.log(context);
}

main();