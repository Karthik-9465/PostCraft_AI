import express from 'express';
import {
  generatePost,
  getOptions,
  getTags,
  healthCheck
} from '../controllers/generateController.js';

const router = express.Router();

// Generation endpoint
router.post('/generate', generatePost);

// Metadata and options endpoints
router.get('/options', getOptions);
router.get('/tags', getTags);
router.get('/health', healthCheck);

export default router;
