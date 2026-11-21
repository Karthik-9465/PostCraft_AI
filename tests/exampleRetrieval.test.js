import test from 'node:test';
import assert from 'node:assert/strict';
import { ExampleRetrievalService } from '../backend/services/exampleRetrievalService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetPath = path.resolve(__dirname, '../backend/data/example_posts.json');

test('ExampleRetrievalService', async (t) => {
  const service = new ExampleRetrievalService(datasetPath);

  await t.test('categorizeLength correctly categorizes line count', () => {
    // Short: lineCount < 5
    assert.equal(service.categorizeLength(1), 'Short');
    assert.equal(service.categorizeLength(4), 'Short');

    // Medium: 5 <= lineCount <= 10
    assert.equal(service.categorizeLength(5), 'Medium');
    assert.equal(service.categorizeLength(7), 'Medium');
    assert.equal(service.categorizeLength(10), 'Medium');

    // Long: lineCount > 10
    assert.equal(service.categorizeLength(11), 'Long');
    assert.equal(service.categorizeLength(16), 'Long');
    assert.equal(service.categorizeLength(19), 'Long');
  });

  await t.test('loads exact dataset posts count and tags', () => {
    assert.equal(service.getPostCount(), 10);

    const tags = service.getTags();
    assert.ok(Array.isArray(tags));
    assert.equal(tags.length, 13);

    const expectedTags = [
      'Career Advice',
      'Influencer',
      'Job Search',
      'Leadership',
      'Mental Health',
      'Motivation',
      'Online Dating',
      'Organic Growth',
      'Productivity',
      'Sapne',
      'Scams',
      'Self Improvement',
      'Time Management'
    ];
    assert.deepEqual(tags, expectedTags);
  });

  await t.test('filters posts matching (Medium, English, Job Search)', () => {
    const results = service.getFilteredPosts('Medium', 'English', 'Job Search');
    assert.ok(results.length >= 1);
    results.forEach((post) => {
      assert.equal(post.language, 'English');
      assert.equal(post.length, 'Medium');
      assert.ok(post.tags.includes('Job Search'));
    });
  });

  await t.test('filters posts matching (Short, English, Influencer)', () => {
    const results = service.getFilteredPosts('Short', 'English', 'Influencer');
    assert.equal(results.length, 1);
    assert.ok(results[0].text.includes('LinkedIn Influencer'));
  });

  await t.test('filters posts matching (Short, Hinglish, Job Search)', () => {
    const results = service.getFilteredPosts('Short', 'Hinglish', 'Job Search');
    assert.equal(results.length, 1);
    assert.equal(results[0].language, 'Hinglish');
    assert.ok(results[0].text.includes('sapne dekhna'));
  });

  await t.test('returns empty array when no matches exist', () => {
    const results = service.getFilteredPosts('Long', 'Hinglish', 'NonExistentTag');
    assert.equal(results.length, 0);
  });
});
