function buildPrompt(question, context) {
    return `
You are a fruit knowledge assistant.

Answer ONLY using the provided context.

If the answer is not in the context, say:
"I could not find that information in the knowledge base."

Context:
${context}

Question:
${question}
`;
}

module.exports = {
    buildPrompt
};