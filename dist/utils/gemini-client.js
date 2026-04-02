"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const genai_1 = require("@google/genai");
const system_prompt_1 = require("../prompts/system-prompt");
class GeminiClient {
    constructor(apiKey) {
        this.genAI = new genai_1.GoogleGenAI({ apiKey });
    }
    async reviewCode(diff, prTitle, prDescription) {
        try {
            const prompt = this.buildPrompt(diff, prTitle, prDescription);
            const response = await this.genAI.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [
                    { role: "user", parts: [{ text: system_prompt_1.SYSTEM_PROMPT }] },
                    { role: "user", parts: [{ text: prompt }] }
                ]
            });
            const responseText = response.text || '';
            // Parse JSON response
            const cleanedResponse = this.cleanJsonResponse(responseText);
            const reviewData = JSON.parse(cleanedResponse);
            return this.validateResponse(reviewData);
        }
        catch (error) {
            throw new Error(`Gemini API error: ${error}`);
        }
    }
    buildPrompt(diff, prTitle, prDescription) {
        return `
PR Title: ${prTitle}
PR Description: ${prDescription}

Code Diff:
\`\`\`diff
${diff}
\`\`\`

Please review this pull request and provide feedback according to the specified criteria.
    `.trim();
    }
    cleanJsonResponse(response) {
        // Remove any markdown code blocks or extra formatting
        let cleaned = response.trim();
        // Remove markdown code block markers
        cleaned = cleaned.replace(/^```json\s*\n/, '').replace(/\n```$/, '');
        // Remove any leading/trailing whitespace
        cleaned = cleaned.trim();
        return cleaned;
    }
    validateResponse(response) {
        if (!response.summary || !response.comments || !Array.isArray(response.comments)) {
            throw new Error('Invalid Gemini response format');
        }
        // Validate each comment
        response.comments = response.comments.filter(comment => {
            return comment.file &&
                comment.line &&
                comment.type &&
                comment.severity &&
                comment.title &&
                comment.description;
        });
        return response;
    }
}
exports.GeminiClient = GeminiClient;
