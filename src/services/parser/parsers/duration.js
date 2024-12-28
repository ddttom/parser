import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('DurationParser');

export const name = 'duration';

function isValidDuration(hours, minutes) {
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

export async function parse(text) {
  const validationError = validateParserInput(text, 'DurationParser');
  if (validationError) {
    return validationError;
  }

  const patterns = {
    short_duration: /(\d+(?:\.\d+)?)(h)/i,
    minutes_only: /(\d+)m\b/i,
    natural: /(?:takes\s+(?:about\s+))?(\d+\s*(?:hours?\s*(?:and\s*(\d+)\s*minutes?)?|minutes?))/i
  };

  let bestMatch = null;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      switch (pattern) {
        case 'short_duration': {
          const amount = parseFloat(match[1]);
          const hours = Math.floor(amount);
          const minutes = Math.round((amount - hours) * 60);

          if (!isValidDuration(hours, minutes)) {
            continue;
          }

          confidence = Confidence.HIGH;
          value = {
            hours,
            minutes,
            totalMinutes: hours * 60 + minutes
          };
          break;
        }

        case 'minutes_only': {
          const totalMinutes = parseInt(match[1], 10);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;

          if (!isValidDuration(hours, minutes)) {
            continue;
          }

          confidence = Confidence.HIGH;
          value = {
            hours,
            minutes,
            totalMinutes
          };
          break;
        }

        case 'natural': {
          let hours = 0;
          let minutes = 0;
          
          const durationText = match[1];
          const hoursMatch = durationText.match(/(\d+)\s*hours?/);
          const minutesMatch = durationText.match(/(\d+)\s*minutes?/);

          if (hoursMatch) {
            hours = parseInt(hoursMatch[1], 10);
          }
          if (minutesMatch) {
            minutes = parseInt(minutesMatch[1], 10);
          } else if (!hoursMatch) {
            // If no hours and no explicit minutes, treat number as minutes
            minutes = parseInt(match[1], 10);
          }

          if (!isValidDuration(hours, minutes)) {
            continue;
          }

          confidence = Confidence.MEDIUM;
          value = {
            hours,
            minutes,
            totalMinutes: hours * 60 + minutes
          };
          break;
        }
      }

      // Compare confidence levels - HIGH > MEDIUM > LOW
      const shouldUpdate = !bestMatch || 
          confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH ||
          confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW;
      
      if (shouldUpdate) {
        bestMatch = {
          type: name,
          value,
          metadata: {
            confidence,
            pattern,
            originalMatch: pattern === 'natural' ? match[1] : match[0]
          }
        };
      }
    }
  }

  return bestMatch;
}
