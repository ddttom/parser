import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('LocationParser');

export const name = 'location';

function parseParameters(paramStr) {
  if (!paramStr || !paramStr.trim()) return null;
  
  const params = {};
  const parts = paramStr.trim().split(/\s*,\s*/);
  
  for (const part of parts) {
    // Split on first space to handle multi-word values
    const spaceIndex = part.indexOf(' ');
    if (spaceIndex === -1) return null;
    
    const key = part.substring(0, spaceIndex).trim();
    const value = part.substring(spaceIndex + 1).trim();
    
    if (!key || !value) return null;
    params[key.toLowerCase()] = value;
  }

  return Object.keys(params).length > 0 ? params : null;
}

function inferLocationType(location) {
  if (/\b(?:room|conference|meeting)\b/i.test(location)) return 'room';
  if (/\boffice\b/i.test(location)) return 'office';
  if (/\bbuilding\b/i.test(location)) return 'building';
  return 'unknown';
}

export async function parse(text) {
  const validationError = validateParserInput(text, 'LocationParser');
  if (validationError) {
    return validationError;
  }

  // Try location patterns
  const patterns = {
    room_location: /(?:(?:in|at)\s+(?:the\s+)?)?(?:room|conference room|meeting room)\s+([A-Za-z0-9-]+)(?:\s*(?:floor|level)\s+(\d+))?\b/i,
    office_location: /(?:(?:in|at)\s+(?:the\s+)?)?(?:office)\s+([A-Za-z0-9-]+)(?:\s*(?:floor|level)\s+(\d+))?\b/i,
    building_location: /(?:(?:in|at)\s+(?:the\s+)?)?(?:building)\s+([A-Za-z0-9-]+)(?:\s*(?:floor|level)\s+(\d+))?\b/i,
    inferred_location: /\b(?:in|at)\s+(?:the\s+)?([^,.]+?)(?:\s*(?:floor|level)\s+(\d+))?\b(?:[,.]|\s|$)/i
  };

  let bestMatch = null;
  let highestConfidence = Confidence.LOW;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;
      let originalMatch;

      switch (pattern) {
        case 'room_location': {
          const roomNumber = match[1].trim();
          if (!roomNumber) continue;

          confidence = Confidence.MEDIUM;
          originalMatch = match[0].trim();
          value = {
            name: `Room ${roomNumber}`,
            type: 'room'
          };
          if (match[2]) {
            value.parameters = { floor: match[2] };
          }
          break;
        }

        case 'office_location': {
          const officeNumber = match[1].trim();
          if (!officeNumber) continue;

          confidence = Confidence.MEDIUM;
          originalMatch = match[0].trim();
          value = {
            name: `Office ${officeNumber}`,
            type: 'office'
          };
          if (match[2]) {
            value.parameters = { floor: match[2] };
          }
          break;
        }

        case 'building_location': {
          const buildingId = match[1].trim();
          if (!buildingId) continue;

          confidence = Confidence.MEDIUM;
          originalMatch = match[0].trim();
          value = {
            name: `Building ${buildingId}`,
            type: 'building'
          };
          if (match[2]) {
            value.parameters = { floor: match[2] };
          }
          break;
        }

        case 'inferred_location': {
          const name = match[1].trim();
          if (!name) continue;

          confidence = Confidence.LOW;
          originalMatch = match[0].trim();
          value = {
            name,
            type: inferLocationType(name)
          };
          if (match[2]) {
            value.parameters = { floor: match[2] };
          }
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
          type: 'location',
          value,
          metadata: {
            confidence,
            pattern,
            originalMatch
          }
        };
      }
    }
  }

  return bestMatch;
}
