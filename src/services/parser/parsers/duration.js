import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('DurationParser');

export const name = 'duration';

function isValidDuration(hours, minutes) {
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
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
    explicit_duration: /\[duration:(\d+)h(?:\s*(\d+)m)?\]/i,
    short_duration: /(\d+(?:\.\d+)?)(h)/i,
    natural: /(?:takes\s+(?:about\s+))?(\d+\s*(?:hours?\s*(?:and\s*(\d+)\s*minutes?)?|minutes?))/i
  };

  let bestMatch = null;
  let highestConfidence = 0;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      switch (pattern) {
        case 'explicit_duration': {
          const hours = parseInt(match[1], 10);
          const minutes = match[2] ? parseInt(match[2], 10) : 0;

          if (!isValidDuration(hours, minutes)) {
            continue;
          }

          confidence = 0.95;
          value = {
            hours,
            minutes,
            totalMinutes: hours * 60 + minutes
          };
          break;
        }

        case 'short_duration': {
          const amount = parseFloat(match[1]);
          const hours = Math.floor(amount);
          const minutes = Math.round((amount - hours) * 60);

          if (!isValidDuration(hours, minutes)) {
            continue;
          }

          confidence = 0.9;
          value = {
            hours,
            minutes,
            totalMinutes: hours * 60 + minutes
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

          confidence = 0.8;
          value = {
            hours,
            minutes,
            totalMinutes: hours * 60 + minutes
          };
          break;
        }
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          type: 'duration',
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
