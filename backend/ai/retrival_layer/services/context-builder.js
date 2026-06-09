function buildContext(results) {
  return results
    .map((result) => {
      const fruit = result.payload;

      return `
Fruit: ${fruit.fruit}

Components:
${(fruit.components || [])
  .map(c => `- ${c.name || ''}: ${c.description || ''}`)
  .join("\n")}

Vitamins:
${(fruit.vitamins || []).join(", ")}

Minerals:
${(fruit.minerals || []).join(", ")}
`;
    })
    .join("\n-------------------\n");
}

module.exports = {
  buildContext
};
