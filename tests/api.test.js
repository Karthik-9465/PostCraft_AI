import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../backend/server.js';
import { groqService } from '../backend/services/groqService.js';

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    // Start on ephemeral port for tests
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test('API Endpoints Test Suite', async (t) => {
  await t.test('GET /api/health returns 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.model, 'openai/gpt-oss-20b');
  });

  await t.test('GET /api/options returns tags, lengths, and languages', async () => {
    const res = await fetch(`${baseUrl}/api/options`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.tags));
    assert.equal(data.tags.length, 13);
    assert.deepEqual(data.lengths, ['Short', 'Medium', 'Long']);
    assert.deepEqual(data.languages, ['English', 'Hinglish', 'Hindi']);
  });

  await t.test('GET /api/tags returns tags list', async () => {
    const res = await fetch(`${baseUrl}/api/tags`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.tags.includes('Mental Health'));
    assert.ok(data.tags.includes('Job Search'));
  });

  await t.test('POST /api/generate rejects empty topic with 400', async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: '', length: 'Medium', language: 'English' })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Topic cannot be empty/);
  });

  await t.test('POST /api/generate rejects invalid length with 400', async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'AI', length: 'ExtraLarge', language: 'English' })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Invalid length/);
  });

  await t.test('POST /api/generate rejects invalid language with 400', async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'AI', length: 'Medium', language: 'German' })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Invalid language/);
  });

  await t.test('POST /api/generate with mocked LLM completes full generation cycle', async () => {
    // Temporarily stub groqService.generatePost
    const originalGenerate = groqService.generatePost;
    groqService.generatePost = async (prompt) => {
      assert.ok(prompt.includes('Job Search'));
      assert.ok(prompt.includes('6 to 10 lines'));
      return 'Stubbed AI LinkedIn Post about Job Search';
    };

    try {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Job Search',
          length: 'Medium',
          language: 'English'
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.generatedPost, 'Stubbed AI LinkedIn Post about Job Search');
      assert.ok(data.examplesUsed >= 1);
      assert.ok(data.examplesUsed <= 2);
      assert.equal(data.metadata.topic, 'Job Search');
      assert.equal(data.metadata.length, 'Medium');
      assert.equal(data.metadata.language, 'English');
      assert.equal(data.metadata.model, 'openai/gpt-oss-20b');
    } finally {
      groqService.generatePost = originalGenerate;
    }
  });

  await t.test('POST /api/generate handles 404 model_not_found error appropriately', async () => {
    const originalGenerate = groqService.generatePost;
    groqService.generatePost = async () => {
      const err = new Error('Groq model "non-existent-model" not found or you do not have access to it.');
      err.statusCode = 404;
      throw err;
    };

    try {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Job Search', length: 'Medium', language: 'English' })
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /not found or you do not have access/);
    } finally {
      groqService.generatePost = originalGenerate;
    }
  });

  await t.test('POST /api/generate handles 429 rate limit or quota exceeded', async () => {
    const originalGenerate = groqService.generatePost;
    groqService.generatePost = async () => {
      const err = new Error('Groq API rate limit reached. Please wait a moment before retrying.');
      err.statusCode = 429;
      throw err;
    };

    try {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Job Search', length: 'Medium', language: 'English' })
      });

      assert.equal(res.status, 429);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /rate limit reached/);
    } finally {
      groqService.generatePost = originalGenerate;
    }
  });

  await t.test('POST /api/generate handles 504 network failure or timeout', async () => {
    const originalGenerate = groqService.generatePost;
    groqService.generatePost = async () => {
      const err = new Error('Network failure connecting to Groq API. Please check your internet connection.');
      err.statusCode = 504;
      throw err;
    };

    try {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Job Search', length: 'Medium', language: 'English' })
      });

      assert.equal(res.status, 504);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Network failure/);
    } finally {
      groqService.generatePost = originalGenerate;
    }
  });

  await t.test('POST /api/generate supports all three post lengths and both languages', async () => {
    const originalGenerate = groqService.generatePost;
    const testCases = [
      { length: 'Short', language: 'English', expectedLines: '1 to 5 lines' },
      { length: 'Medium', language: 'Hinglish', expectedLines: '6 to 10 lines' },
      { length: 'Long', language: 'English', expectedLines: '11 to 15 lines' }
    ];

    try {
      for (const tc of testCases) {
        groqService.generatePost = async (prompt) => {
          assert.ok(prompt.includes(tc.expectedLines));
          assert.ok(prompt.includes(tc.language));
          return `Mock post for ${tc.length} in ${tc.language}`;
        };

        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: 'Motivation',
            length: tc.length,
            language: tc.language
          })
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.metadata.length, tc.length);
        assert.equal(data.metadata.language, tc.language);
      }
    } finally {
      groqService.generatePost = originalGenerate;
    }
  });

  await t.test('POST /api/generate returns 503 error when Groq API key is not configured', async () => {
    const originalApiKey = groqService.apiKey;
    const originalClient = groqService.client;
    const originalEnvKey = process.env.GROQ_API_KEY;

    try {
      groqService.apiKey = '';
      groqService.client = null;
      delete process.env.GROQ_API_KEY;

      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Job Search',
          length: 'Short',
          language: 'English'
        })
      });

      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Groq API key is missing/);
    } finally {
      groqService.apiKey = originalApiKey;
      groqService.client = originalClient;
      if (originalEnvKey) {
        process.env.GROQ_API_KEY = originalEnvKey;
      }
    }
  });

  await t.test('POST /api/generate executes live inference with openai/gpt-oss-20b when API key is provided', async (tCtx) => {
    if (!process.env.GROQ_API_KEY) {
      tCtx.skip('Skipping live Groq inference test because GROQ_API_KEY is not configured');
      return;
    }

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Job Search',
        length: 'Short',
        language: 'English'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.generatedPost, 'string');
    assert.ok(data.generatedPost.length > 20);
    assert.equal(data.metadata.model, 'openai/gpt-oss-20b');
  });
});
