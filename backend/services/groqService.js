import Groq from 'groq-sdk';
import { config } from '../config/config.js';

export class GroqService {
  constructor(apiKey = config.groqApiKey, model = config.groqModel) {
    this.apiKey = apiKey;
    this.model = model;
    this.client = null;

    if (this.apiKey) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
  }

  /**
   * Reinitializes or updates the client (useful for dynamic config or tests).
   */
  updateConfig(apiKey, model) {
    this.apiKey = apiKey || this.apiKey;
    this.model = model || this.model;
    if (this.apiKey) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
  }

  /**
   * Sends prompt to Groq API with configured model (default: openai/gpt-oss-20b).
   * @param {string} prompt - Formatted few-shot prompt
   * @returns {Promise<string>} Generated LinkedIn post
   */
  async generatePost(prompt) {
    // If client is not initialized, check if process.env.GROQ_API_KEY was added dynamically
    if (!this.client && process.env.GROQ_API_KEY) {
      this.apiKey = process.env.GROQ_API_KEY;
      this.client = new Groq({ apiKey: this.apiKey });
    }

    if (!this.client || !this.apiKey) {
      const err = new Error(
        'Groq API key is missing. Please set GROQ_API_KEY in your .env file or environment.'
      );
      err.statusCode = 503;
      throw err;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Groq API returned an empty completion.');
      }

      return content.trim();
    } catch (error) {
      // 1. Invalid API Key / Authentication
      if (error?.status === 401 || error?.error?.code === 'invalid_api_key') {
        const err = new Error('Groq API authentication failed. Please verify your GROQ_API_KEY.');
        err.statusCode = 401;
        throw err;
      }

      // 2. Model Not Found
      if (
        error?.status === 404 ||
        error?.error?.code === 'model_not_found' ||
        error?.message?.includes('model_not_found') ||
        error?.message?.includes('does not exist or you do not have access')
      ) {
        const err = new Error(
          `Groq model "${this.model}" not found or you do not have access to it. Please check your model configuration.`
        );
        err.statusCode = 404;
        throw err;
      }

      // 3. Quota Exceeded & Rate Limit
      if (
        error?.status === 429 ||
        error?.error?.code === 'insufficient_quota' ||
        error?.message?.toLowerCase().includes('quota')
      ) {
        const isQuota = error?.error?.code === 'insufficient_quota' || error?.message?.toLowerCase().includes('quota');
        const err = new Error(
          isQuota
            ? 'Groq API quota exceeded. Please check your account usage and billing limits.'
            : 'Groq API rate limit reached. Please wait a moment before retrying.'
        );
        err.statusCode = 429;
        throw err;
      }

      // 4. Network Failures & Timeouts
      if (
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ENOTFOUND' ||
        error?.code === 'ECONNREFUSED' ||
        error?.name === 'AbortError' ||
        error?.name === 'FetchError'
      ) {
        const err = new Error(
          'Network failure connecting to Groq API. Please check your internet connection and proxy settings.'
        );
        err.statusCode = 504;
        throw err;
      }

      // Re-throw generic error
      throw error;
    }
  }
}

export const groqService = new GroqService();
export default groqService;
