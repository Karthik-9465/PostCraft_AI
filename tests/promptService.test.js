import test from 'node:test';
import assert from 'node:assert/strict';
import { getLengthString, constructPrompt } from '../backend/services/promptService.js';

test('PromptService', async (t) => {
  await t.test('getLengthString maps length categories to exact line count descriptions', () => {
    assert.equal(getLengthString('Short'), '1 to 5 lines');
    assert.equal(getLengthString('Medium'), '6 to 10 lines');
    assert.equal(getLengthString('Long'), '11 to 15 lines');
  });

  await t.test('constructPrompt constructs base prompt without examples when list is empty', () => {
    const prompt = constructPrompt('Medium', 'English', 'Career Advice', []);

    assert.ok(prompt.includes('Generate a LinkedIn post using the below information. No preamble.'));
    assert.ok(prompt.includes('1) Topic: Career Advice'));
    assert.ok(prompt.includes('2) Length: 6 to 10 lines'));
    assert.ok(prompt.includes('3) Language: English'));
    assert.ok(prompt.includes('If Language is Hinglish then it means it is a mix of Hindi and English.'));
    assert.ok(prompt.includes('The script for the generated post should always be English.'));
    assert.equal(prompt.includes('4) Use the writing style as per the following examples.'), false);
  });

  await t.test('constructPrompt includes examples up to maximum of 2', () => {
    const mockExamples = [
      { text: 'Sample Post Number One' },
      { text: 'Sample Post Number Two' },
      { text: 'Sample Post Number Three (Should be omitted)' }
    ];

    const prompt = constructPrompt('Short', 'Hinglish', 'Motivation', mockExamples, 2);

    assert.ok(prompt.includes('4) Use the writing style as per the following examples.'));
    assert.ok(prompt.includes('Example 1: \n\n Sample Post Number One'));
    assert.ok(prompt.includes('Example 2: \n\n Sample Post Number Two'));
    // Third example must be sliced off
    assert.equal(prompt.includes('Sample Post Number Three'), false);
  });

  await t.test('constructPrompt handles 1 example correctly', () => {
    const mockExamples = [{ text: 'Single sample post' }];
    const prompt = constructPrompt('Long', 'English', 'Leadership', mockExamples, 2);

    assert.ok(prompt.includes('4) Use the writing style as per the following examples.'));
    assert.ok(prompt.includes('Example 1: \n\n Single sample post'));
    assert.equal(prompt.includes('Example 2:'), false);
  });
});
