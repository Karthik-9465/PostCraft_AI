import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';

export class ExampleRetrievalService {
  constructor(filePath = config.datasetPath) {
    this.posts = [];
    this.uniqueTags = [];
    this.loadPosts(filePath);
  }

  /**
   * Categorizes the line count of a post into Short, Medium, or Long.
   * Matches original logic in few_shot.py.
   * @param {number} lineCount
   * @returns {'Short' | 'Medium' | 'Long'}
   */
  categorizeLength(lineCount) {
    if (lineCount < 5) {
      return 'Short';
    } else if (lineCount >= 5 && lineCount <= 10) {
      return 'Medium';
    } else {
      return 'Long';
    }
  }

  /**
   * Loads and normalizes posts from JSON file.
   * @param {string} filePath
   */
  loadPosts(filePath) {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Dataset file not found at path: ${resolvedPath}`);
    }

    const rawData = fs.readFileSync(resolvedPath, 'utf-8');
    const parsedPosts = JSON.parse(rawData);

    const tagSet = new Set();

    this.posts = parsedPosts.map((post) => {
      const lengthCategory = this.categorizeLength(post.line_count);
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => tagSet.add(tag));
      }
      return {
        ...post,
        length: lengthCategory
      };
    });

    this.uniqueTags = Array.from(tagSet).sort();
  }

  /**
   * Filters posts by length category, language, and topic tag.
   * Matches original logic: (tag in tags) & (language == language) & (length == length)
   * Supports exact match and case-insensitive match for robust tag lookups.
   * @param {string} length
   * @param {string} language
   * @param {string} tag
   * @returns {Array<object>}
   */
  getFilteredPosts(length, language, tag) {
    if (!tag) return [];

    const normalizedTag = tag.trim().toLowerCase();

    return this.posts.filter((post) => {
      const matchesLanguage = post.language === language;
      const matchesLength = post.length === length;
      const matchesTag = Array.isArray(post.tags) && post.tags.some(
        (t) => t.toLowerCase() === normalizedTag
      );

      return matchesTag && matchesLanguage && matchesLength;
    });
  }

  /**
   * Returns list of unique tags in dataset.
   * @returns {string[]}
   */
  getTags() {
    return [...this.uniqueTags];
  }

  /**
   * Returns total count of loaded posts.
   * @returns {number}
   */
  getPostCount() {
    return this.posts.length;
  }
}

// Export singleton instance
export const exampleRetrievalService = new ExampleRetrievalService();
export default exampleRetrievalService;
