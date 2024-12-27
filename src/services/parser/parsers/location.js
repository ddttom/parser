import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('LocationParser');

export const name = 'location';

function inferLocationType(location) {
  const roomKeywords = /\b(?:room|conference|meeting|office)\b/i;
  return roomKeywords.test(location) ? 'room' : 'unknown';
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
    explicit_location: /\[location:([^\]]+)\]/i,
    inferred_location: /\b(?:in|at)\s+(?:the\s+)?([^,.]+?)(?:[,.]|\s|$)/i
  };

  let bestMatch = null;
  let highestConfidence = 0;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      const name = match[1].trim();
      if (!name) {
        continue;
      }

      switch (pattern) {
        case 'explicit_location': {
          confidence = 0.95;
          value = {
            name,
            type: inferLocationType(name)
          };
          break;
        }

        case 'inferred_location': {
          confidence = 0.75;
          value = {
            name,
            type: inferLocationType(name)
          };
          break;
        }
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          type: 'location',
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
