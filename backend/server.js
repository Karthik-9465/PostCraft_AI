import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/config.js';
import generateRoutes from './routes/generateRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API routes
app.use('/api', generateRoutes);

// Catch-all route to serve the frontend single-page application
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred.'
  });
});

// Only start the server if executed directly as main script
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`  LinkedIn Post Generator (JavaScript GenAI)`);
    console.log(`  Server running at: http://localhost:${config.port}`);
    console.log(`  Model: ${config.groqModel}`);
    console.log(`  Groq API Key Configured: ${Boolean(config.groqApiKey)}`);
    console.log(`====================================================`);
  });
}

export default app;
