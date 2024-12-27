import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('PriorityParser');

export const name = 'priority';

const PRIORITY_LEVELS = {
  urgent: 1,
  high: 2,
  medium: 3,
  normal: 4,
  low: 5
};

const VALID_PRIORITIES = new Set(Object.keys(PRIORITY_LEVELS));

function extractPriorityValue(match, pattern) {
  switch (pattern) {
    case 'explicit': {
      return {
        priority: match[1].toLowerCase(),
        confidence: 0.95
      };
    }

    case 'numeric': {
      const level = parseInt(match[1], 10);
      const priorities = ['urgent', 'high', 'medium', 'normal', 'low'];
      return {
        priority: priorities[level - 1],
        confidence: 0.9
      };
    }

    case 'shorthand': {
      const count = match[1].length;
      if (count > 3) return null;
      return {
        priority: count === 3 ? 'urgent' : count === 2 ? 'high' : 'medium',
        confidence: 0.9
      };
    }

    case 'prefix': {
      return {
        priority: match[1].toLowerCase(),
        confidence: 0.8
      };
    }

    case 'contextual': {
      const term = match[1].toLowerCase();
      const isUrgent = term === 'urgent' || term === 'asap' || term === 'critical';
      return {
        priority: term === 'blocking' ? 'high' : 'urgent',
        confidence: isUrgent ? 0.95 : 0.85
      };
    }

    default:
      return null;
  }
}

export async function parse(text) {
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  const patterns = {
    explicit: /\bpriority:\s*(urgent|high|medium|normal|low)\b/i,
    numeric: /\bp([1-5])\b/i,
    shorthand: /^(!{1,3})$/,
    prefix: /\b(urgent|high|medium|normal|low)\s+priority\b/i,
    contextual: /\b(asap|urgent|critical|blocking)\b/i
  };

  try {
    let bestMatch = null;
    let highestConfidence = 0;

    for (const [pattern, regex] of Object.entries(patterns)) {
      const match = text.match(regex);
      if (match) {
        const result = parse.extractPriorityValue(match, pattern);
        if (result && result.priority && VALID_PRIORITIES.has(result.priority) && result.confidence > highestConfidence) {
          highestConfidence = result.confidence;
          bestMatch = {
            type: 'priority',
            value: {
              priority: result.priority
            },
            metadata: {
              confidence: result.confidence,
              pattern,
              originalMatch: match[0],
              level: PRIORITY_LEVELS[result.priority]
            }
          };
        }
      }
    }

    return bestMatch;
  } catch (error) {
    logger.error('Error in priority parser:', error);
    return {
      type: 'error',
      error: 'PARSER_ERROR',
      message: error.message
    };
  }
}

// Make extractPriorityValue available for mocking in tests
parse.extractPriorityValue = extractPriorityValue;
