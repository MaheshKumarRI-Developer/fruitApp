function buildDocument(fruit) {
  const componentText = fruit.components
    .map(
      component =>
        `${component.name}: ${component.description}`
    )
    .join("\n");

  return `
Fruit: ${fruit.fruit}

Components:
${componentText}

Vitamins:
${fruit.vitamins.join(", ")}

Minerals:
${fruit.minerals.join(", ")}
`.trim();
}

module.exports = {
  buildDocument,
};
