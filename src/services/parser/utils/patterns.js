import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('PatternUtils');

/**
 * Compile patterns for better performance
 * @param {Object} patterns - Raw patterns object
 * @returns {Map} Compiled patterns
 */
export function compilePatterns(patterns) {
  try {
    // Return empty Map if patterns is invalid
    if (!patterns || typeof patterns !== 'object') {
      return new Map();
    }

    const compiledPatterns = new Map();

    // Compile each pattern into a RegExp if it isn't already
    Object.entries(patterns).forEach(([key, pattern]) => {
      if (pattern instanceof RegExp) {
        compiledPatterns.set(key, pattern);
      } else if (typeof pattern === 'string') {
        compiledPatterns.set(key, new RegExp(pattern, 'i'));
      }
    });

    return compiledPatterns;
  } catch (error) {
    logger.error('Error compiling patterns:', { error });
    return new Map(); // Return empty Map on error
  }
}

/**
 * Validate pattern match
 * @param {Object} match - RegExp match result
 * @returns {boolean} Is valid match
 */
export function validatePatternMatch(match) {
  return Boolean(match && match.length > 0);
}

/**
 * Calculate base confidence score for a pattern match
 * @param {Object} match - RegExp match result
 * @param {string} text - Full text being parsed
 * @returns {number} Base confidence score between 0 and 1
 */
export function calculateBaseConfidence(match, text) {
  if (!validatePatternMatch(match)) {
    return 0;
  }

  let confidence = 0.7; // Start with base confidence

  // Increase confidence based on match position
  if (match.index === 0) {
    confidence += 0.1; // Match at start of text
  } else if (text[match.index - 1] === ' ' || text[match.index - 1] === '\n') {
    confidence += 0.05; // Match at word boundary
  }

  // Increase confidence based on match length relative to text length
  const matchLength = match[0].length;
  const textLength = text.length;
  if (matchLength > textLength * 0.5) {
    confidence += 0.1;
  } else if (matchLength > textLength * 0.25) {
    confidence += 0.05;
  }

  // Increase confidence for exact matches
  if (match[0] === text.trim()) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0); // Cap at 1.0
}
