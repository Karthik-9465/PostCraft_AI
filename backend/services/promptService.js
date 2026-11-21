/**
 * Maps the length category to the descriptive line count string.
 * Matches original logic in post_generator.py.
 * @param {'Short' | 'Medium' | 'Long'} length
 * @returns {string}
 */
export function getLengthString(length) {
  switch (length) {
    case 'Short':
      return '1 to 5 lines';
    case 'Medium':
      return '6 to 10 lines';
    case 'Long':
      return '11 to 15 lines';
    default:
      return '6 to 10 lines';
  }
}

/**
 * Constructs the few-shot prompt for LLM text generation.
 * Preserves the exact structure, constraints, and few-shot formatting of the original Python implementation.
 *
 * @param {string} length - 'Short' | 'Medium' | 'Long'
 * @param {string} language - 'English' | 'Hinglish'
 * @param {string} tag - The topic/tag for the post
 * @param {Array<object>} examples - Matched few-shot example posts from dataset
 * @param {number} maxExamples - Maximum number of examples to include (default: 2)
 * @returns {string} The formatted prompt string
 */
export function constructPrompt(length, language, tag, examples = [], maxExamples = 2, tone = '') {
  const lengthStr = getLengthString(length);

  let prompt = `Generate a LinkedIn post using the below information. No preamble.

1) Topic: ${tag}
2) Length: ${lengthStr}
3) Language: ${language}
`;

  if (tone) {
    prompt += `Tone: ${tone}\n`;
  }

  prompt += `If Language is Hinglish then it means it is a mix of Hindi and English. 
The script for the generated post should always be English.
`;

  if (language === 'Hindi') {
    prompt += `Note: Language requested is Hindi. Write the post in Hindi.\n`;
  }

  const selectedExamples = Array.isArray(examples) ? examples.slice(0, maxExamples) : [];

  if (selectedExamples.length > 0) {
    prompt += `4) Use the writing style as per the following examples.`;

    selectedExamples.forEach((post, i) => {
      const postText = post.text || '';
      prompt += `\n\n Example ${i + 1}: \n\n ${postText}`;
    });
  }

  return prompt;
}

export default {
  getLengthString,
  constructPrompt
};
