import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { GeminiResponse } from '../types';

export class GeminiClient {
  private genAI: GoogleGenAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async reviewCode(diff: string, prTitle: string, prDescription: string): Promise<GeminiResponse> {
    try {
      const prompt = this.buildPrompt(diff, prTitle, prDescription);

      const response = await this.genAI.models.generateContent({
        model: "gemini-1.5-pro",
        contents: [
          { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
          { role: "user", parts: [{ text: prompt }] }
        ]
      });

      const responseText = response.text || '';

      // Parse JSON response
      const cleanedResponse = this.cleanJsonResponse(responseText);
      const reviewData = JSON.parse(cleanedResponse) as GeminiResponse;

      return this.validateResponse(reviewData);
    } catch (error) {
      throw new Error(`Gemini API error: ${error}`);
    }
  }

  private buildPrompt(diff: string, prTitle: string, prDescription: string): string {
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

  private cleanJsonResponse(response: string): string {
    // Remove any markdown code blocks or extra formatting
    let cleaned = response.trim();

    // Remove markdown code block markers
    cleaned = cleaned.replace(/^```json\s*\n/, '').replace(/\n```$/, '');

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  private validateResponse(response: GeminiResponse): GeminiResponse {
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
