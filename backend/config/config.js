import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT || 5000,
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  datasetPath: process.env.DATASET_PATH || path.resolve(__dirname, '../data/example_posts.json'),
  allowedLengths: ['Short', 'Medium', 'Long'],
  allowedLanguages: ['English', 'Hinglish', 'Hindi'],
  allowedTones: ['Professional', 'Conversational', 'Inspirational', 'Thought Leadership'],
  maxFewShotExamples: 2,
  requestTimeoutMs: 30000
};

export default config;
