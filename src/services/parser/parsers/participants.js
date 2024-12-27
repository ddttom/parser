import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ParticipantsParser');

export const name = 'participants';

export async function parse(text) {
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  const patterns = {
    explicit_list: /\[participants:([^\]]+)\]/i,
    role_assignment: /(\w+)\s*\(([^)]+)\)(?:\s*and\s*(\w+)\s*\(([^)]+)\))?/i,
    mentions: /@(\w+)(?:\s*and\s*@(\w+))?/i,
    implicit: /\bwith\s+(\w+(?:\s*(?:and|,)\s*\w+)*)/i
  };

  let bestMatch = null;
  let highestConfidence = 0;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      switch (pattern) {
        case 'explicit_list': {
          const participants = match[1]
            .split(/\s*,\s*/)
            .map(p => p.trim())
            .filter(Boolean);

          if (participants.length === 0) {
            continue;
          }

          confidence = 0.95;
          value = {
            participants,
            count: participants.length
          };
          break;
        }

        case 'role_assignment': {
          const participants = [];
          
          if (match[1] && match[2] && match[2].trim()) {
            participants.push({
              name: match[1],
              role: match[2].trim()
            });
          }
          
          if (match[3] && match[4] && match[4].trim()) {
            participants.push({
              name: match[3],
              role: match[4].trim()
            });
          }

          if (participants.length === 0) {
            continue;
          }

          confidence = 0.9;
          value = {
            participants,
            count: participants.length
          };
          break;
        }

        case 'mentions': {
          const participants = [match[1]]
            .concat(match[2] ? [match[2]] : [])
            .filter(Boolean)
            .map(p => p.toLowerCase());

          if (participants.length === 0) {
            continue;
          }

          confidence = 0.9;
          value = {
            participants,
            count: participants.length
          };
          break;
        }

        case 'implicit': {
          const participants = match[1]
            .split(/\s*(?:and|,)\s*/)
            .map(p => p.trim())
            .filter(Boolean);

          if (participants.length === 0) {
            continue;
          }

          confidence = 0.75;
          value = {
            participants,
            count: participants.length
          };
          break;
        }
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          type: 'participants',
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
