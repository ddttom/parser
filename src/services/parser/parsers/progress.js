import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ProgressParser');

export const name = 'progress';

function isValidPercentage(value) {
  return value >= 0 && value <= 100;
}

export async function parse(text) {
  const validationError = validateParserInput(text, 'ProgressParser');
  if (validationError) {
    return validationError;
  }

  const patterns = {
    inferred: /(\d+)%\s*(?:complete|done|finished)/i
  };

  let bestMatch = null;
  let highestConfidence = Confidence.LOW;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      const percentage = parseInt(match[1], 10);
      if (!isValidPercentage(percentage)) {
        continue;
      }

      confidence = Confidence.HIGH;
      value = {
        percentage
      };

      // Update if current confidence is higher or equal priority pattern
      const shouldUpdate = !bestMatch || 
          (confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
          (confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW);
      
      if (shouldUpdate) {
        highestConfidence = confidence;
        bestMatch = {
          progress: {
            ...value,
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
