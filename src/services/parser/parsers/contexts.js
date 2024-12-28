import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';

const logger = createLogger('ContextsParser');

export const name = 'context';

// Context type mapping
const contextTypes = {
  home: 'location',
  office: 'location',
  computer: 'tool',
  morning: 'time',
  afternoon: 'time',
  evening: 'time'
};

export async function parse(text) {
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  const patterns = {
    multiple_contexts: /(@\w+(?:\s+@\w+)+)\b/i,
    parameterized_context: /@(\w+)\(([^)]*)\)/i,
    explicit_context: /@(\w+)\b/i,
    implicit_context: /\b(?:at|in|during|while at)\s+(?:the\s+)?(\w+)\b/i
  };

  let bestMatch = null;
  let highestConfidence = Confidence.LOW;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      switch (pattern) {
        case 'multiple_contexts': {
          const contexts = match[1].match(/@\w+/g).map(ctx => {
            const context = ctx.substring(1);
            return {
              context,
              type: contextTypes[context] || 'location'
            };
          });
          confidence = Confidence.HIGH;
          value = { contexts };
          break;
        }

        case 'parameterized_context': {
          const context = match[1];
          const parameter = match[2].trim();
          // Validate parameter is not empty
          if (!parameter || match[0].endsWith('()')) {
            return null;
          }
          confidence = Confidence.HIGH;
          value = {
            context,
            type: contextTypes[context] || 'location',
            parameter
          };
          break;
        }

        case 'explicit_context': {
          const context = match[1];
          confidence = Confidence.HIGH;
          value = {
            context,
            type: contextTypes[context] || 'location'
          };
          break;
        }

        case 'implicit_context': {
          const context = match[1].toLowerCase();
          confidence = Confidence.LOW;
          value = {
            context,
            type: contextTypes[context] || 'location'
          };
          break;
        }
      }

      // Update if current confidence is higher or equal priority pattern
      const shouldUpdate = !bestMatch || 
          (confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
          (confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW);
      
      if (shouldUpdate) {
        highestConfidence = confidence;
        bestMatch = {
          type: name,
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
