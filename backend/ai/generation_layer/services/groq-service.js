const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function generateAnswer(prompt) {

    const response =
        await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

    return response.choices[0]
        .message
        .content;
}

module.exports = {
    generateAnswer
};