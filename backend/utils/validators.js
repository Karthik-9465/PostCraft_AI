import { config } from '../config/config.js';

/**
 * Validates and sanitizes the user request parameters for post generation.
 * @param {object} body - Request body containing topic, length, and language.
 * @returns {{ isValid: boolean, error?: string, sanitized?: { topic: string, length: string, language: string } }}
 */
export function validateGenerateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { topic, length, language } = body;

  // Validate topic
  if (topic === undefined || topic === null) {
    return { isValid: false, error: 'Field "topic" is required.' };
  }

  if (typeof topic !== 'string' || topic.trim().length === 0) {
    return { isValid: false, error: 'Topic cannot be empty. Please provide a valid topic.' };
  }

  const sanitizedTopic = topic.trim();
  if (sanitizedTopic.length < 2) {
    return { isValid: false, error: 'Topic must be at least 2 characters long.' };
  }

  if (sanitizedTopic.length > 200) {
    return { isValid: false, error: 'Topic exceeds maximum allowed length of 200 characters.' };
  }

  // Validate length
  if (!length) {
    return { isValid: false, error: `Field "length" is required. Allowed values: ${config.allowedLengths.join(', ')}` };
  }

  if (!config.allowedLengths.includes(length)) {
    return {
      isValid: false,
      error: `Invalid length "${length}". Allowed values: ${config.allowedLengths.join(', ')}`
    };
  }

  // Validate language
  if (!language) {
    return { isValid: false, error: `Field "language" is required. Allowed values: ${config.allowedLanguages.join(', ')}` };
  }

  if (!config.allowedLanguages.includes(language)) {
    return {
      isValid: false,
      error: `Invalid language "${language}". Allowed values: ${config.allowedLanguages.join(', ')}`
    };
  }

  const sanitized = {
    topic: sanitizedTopic,
    length,
    language
  };

  if (body.tone && config.allowedTones && config.allowedTones.includes(body.tone)) {
    sanitized.tone = body.tone;
  }

  return {
    isValid: true,
    sanitized
  };
}
