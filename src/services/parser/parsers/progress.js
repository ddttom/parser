import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ProgressParser');

export const name = 'progress';

function isValidPercentage(value) {
  return value >= 0 && value <= 100;
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
    explicit: /\[progress:(\d+)%\]/i,
    inferred: /(\d+)%\s*(?:complete|done|finished)/i
  };

  let bestMatch = null;
  let highestConfidence = 0;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      const percentage = parseInt(match[1], 10);
      if (!isValidPercentage(percentage)) {
        continue;
      }

      switch (pattern) {
        case 'explicit': {
          confidence = 0.95;
          value = {
            percentage
          };
          break;
        }

        case 'inferred': {
          confidence = 0.8;
          value = {
            percentage
          };
          break;
        }
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          type: 'progress',
          value,
          metadata: {
            confidence,
            pattern,
            originalMatch: match[0]
          }
        };
      }
    }
  }

  return bestMatch;
}
