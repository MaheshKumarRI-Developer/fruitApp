const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function generateAnswer(systemPrompt, userPrompt) {

    const response =
        await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            response_format: { type: "json_object" }
        });

    return response.choices[0]
        .message
        .content;
}

module.exports = {
    generateAnswer
};