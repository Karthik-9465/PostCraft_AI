import { validateGenerateRequest } from '../utils/validators.js';
import { exampleRetrievalService } from '../services/exampleRetrievalService.js';
import { constructPrompt } from '../services/promptService.js';
import { groqService } from '../services/groqService.js';
import { config } from '../config/config.js';

/**
 * Controller to handle LinkedIn post generation.
 */
export async function generatePost(req, res) {
  try {
    // 1. Validate user inputs
    const validation = validateGenerateRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const { topic, length, language, tone } = validation.sanitized;

    // 2. Retrieve matched few-shot examples
    const matchedExamples = exampleRetrievalService.getFilteredPosts(length, language, topic);
    const examplesUsed = Math.min(matchedExamples.length, config.maxFewShotExamples);

    // 3. Construct few-shot prompt
    const prompt = constructPrompt(length, language, topic, matchedExamples, config.maxFewShotExamples, tone);

    // 4. Generate post via Groq API (openai/gpt-oss-20b)
    const generatedPost = await groqService.generatePost(prompt);

    // 5. Send response
    return res.status(200).json({
      success: true,
      generatedPost,
      examplesUsed,
      prompt,
      metadata: {
        topic,
        length,
        language,
        model: config.groqModel
      }
    });
  } catch (error) {
    console.error('Error generating post:', error.message);

    // Prioritize explicit error statusCode from GroqService, otherwise determine status
    const isApiKeyError = error.message.includes('Groq API key is missing') || error.message.includes('authentication failed');
    const statusCode = error.statusCode || (isApiKeyError ? 503 : 500);

    return res.status(statusCode).json({
      success: false,
      error: error.message || 'An error occurred during post generation.'
    });
  }
}

/**
 * Controller to fetch all available options (tags, lengths, languages)
 */
export function getOptions(req, res) {
  try {
    const tags = exampleRetrievalService.getTags();
    return res.status(200).json({
      success: true,
      tags,
      lengths: config.allowedLengths,
      languages: config.allowedLanguages,
      tones: config.allowedTones
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve application options.'
    });
  }
}

/**
 * Controller to fetch only unique tags
 */
export function getTags(req, res) {
  try {
    const tags = exampleRetrievalService.getTags();
    return res.status(200).json({
      success: true,
      tags
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve tags.'
    });
  }
}

/**
 * Health check endpoint
 */
export function healthCheck(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'linkedin-post-generator-backend',
    model: config.groqModel,
    timestamp: new Date().toISOString()
  });
}

export default {
  generatePost,
  getOptions,
  getTags,
  healthCheck
};
