import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGenerateRequest } from '../backend/utils/validators.js';

test('Validators - validateGenerateRequest', async (t) => {
  await t.test('rejects empty or null payload', () => {
    const res1 = validateGenerateRequest(null);
    assert.equal(res1.isValid, false);
    assert.match(res1.error, /JSON object/);

    const res2 = validateGenerateRequest(undefined);
    assert.equal(res2.isValid, false);
  });

  await t.test('rejects missing or empty topic', () => {
    const res1 = validateGenerateRequest({ topic: '', length: 'Medium', language: 'English' });
    assert.equal(res1.isValid, false);
    assert.match(res1.error, /Topic cannot be empty/);

    const res2 = validateGenerateRequest({ topic: '   ', length: 'Medium', language: 'English' });
    assert.equal(res2.isValid, false);

    const res3 = validateGenerateRequest({ length: 'Medium', language: 'English' });
    assert.equal(res3.isValid, false);
    assert.match(res3.error, /Field "topic" is required/);
  });

  await t.test('rejects topic shorter than 2 characters or longer than 200 characters', () => {
    const res1 = validateGenerateRequest({ topic: 'a', length: 'Medium', language: 'English' });
    assert.equal(res1.isValid, false);
    assert.match(res1.error, /at least 2 characters/);

    const longTopic = 'a'.repeat(201);
    const res2 = validateGenerateRequest({ topic: longTopic, length: 'Medium', language: 'English' });
    assert.equal(res2.isValid, false);
    assert.match(res2.error, /exceeds maximum allowed length/);
  });

  await t.test('rejects invalid or missing length', () => {
    const res1 = validateGenerateRequest({ topic: 'AI', language: 'English' });
    assert.equal(res1.isValid, false);
    assert.match(res1.error, /Field "length" is required/);

    const res2 = validateGenerateRequest({ topic: 'AI', length: 'Huge', language: 'English' });
    assert.equal(res2.isValid, false);
    assert.match(res2.error, /Invalid length/);
  });

  await t.test('rejects invalid or missing language', () => {
    const res1 = validateGenerateRequest({ topic: 'AI', length: 'Medium' });
    assert.equal(res1.isValid, false);
    assert.match(res1.error, /Field "language" is required/);

    const res2 = validateGenerateRequest({ topic: 'AI', length: 'Medium', language: 'Spanish' });
    assert.equal(res2.isValid, false);
    assert.match(res2.error, /Invalid language/);
  });

  await t.test('accepts valid payload and trims topic', () => {
    const res = validateGenerateRequest({
      topic: '  Leadership & Teamwork  ',
      length: 'Short',
      language: 'Hinglish'
    });
    assert.equal(res.isValid, true);
    assert.equal(res.sanitized.topic, 'Leadership & Teamwork');
    assert.equal(res.sanitized.length, 'Short');
    assert.equal(res.sanitized.language, 'Hinglish');
  });
});
