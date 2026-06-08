const { z } = require('zod');

// We use Zod for the schema and validation
const fruitSchema = z.object({
  fruit: z.string(),
  components: z.array(
    z.object({
      name: z.string(),
      amount: z.string().optional(),
      description: z.string().optional()
    })
  ),
  vitamins: z.array(z.union([z.string(), z.any()])),
  minerals: z.array(z.union([z.string(), z.any()]))
});

module.exports = {
  fruitSchema
};
