const parseLLMResponse = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Parser received empty or invalid input.');
  }

  // Step 1: Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Step 2: Extract the first JSON object using a greedy regex
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Parser could not find a JSON object in the LLM response.\nRaw output: ${rawText.slice(0, 300)}`);
  }

  // Step 3: Parse the extracted string into a JS object
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    throw new Error(`Parser found a JSON-like block but failed to parse it: ${err.message}\nExtracted: ${match[0].slice(0, 300)}`);
  }
};

module.exports = {
  parseLLMResponse
};
