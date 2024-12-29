import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ProgressParser');

export const name = 'progress';

function isValidPercentage(value) {
  return value >= 0 && value <= 100;
}

function formatProgress(progressInfo) {
  return `${progressInfo.percentage}% complete`;
}

export async function perfect(text) {
  const validationError = validateParserInput(text, 'ProgressParser');
  if (validationError) {
    return validationError;
  }

  try {
    const patterns = {
      inferred: /(\d+)%\s*(?:complete|done|finished)/i
    };

    for (const [pattern, regex] of Object.entries(patterns)) {
      const match = text.match(regex);
      if (match) {
        const percentage = parseInt(match[1], 10);
        if (!isValidPercentage(percentage)) {
          continue;
        }

        const progressInfo = {
          percentage,
          confidence: Confidence.HIGH,
          pattern,
          originalMatch: match[0]
        };

        const correction = {
          type: 'progress',
          original: progressInfo.originalMatch,
          correction: formatProgress(progressInfo),
          position: {
            start: text.indexOf(progressInfo.originalMatch),
            end: text.indexOf(progressInfo.originalMatch) + progressInfo.originalMatch.length
          },
          confidence: 'HIGH'
        };

        // Apply correction
        const before = text.substring(0, correction.position.start);
        const after = text.substring(correction.position.end);
        const perfectedText = before + correction.correction + after;

        return {
          text: perfectedText,
          corrections: [correction]
        };
      }
    }

    return {
      text,
      corrections: []
    };
  } catch (error) {
    logger.error('Error in progress parser:', error);
    throw error;
  }
}
