const { fruitSchema } = require('../schemes/index.js');

const validateFruitResponse = (data) => {
  try {
    // Parse the JSON string if it comes as a string
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    // Validate with Zod
    const validated = fruitSchema.parse(parsedData);
    console.log('[TRACE] validateFruitResponse zod validation completed');
    return validated;
  } catch (error) {
    throw new Error('Validation failed: ' + error.message);
  }
};

module.exports = {
  validateFruitResponse
};
