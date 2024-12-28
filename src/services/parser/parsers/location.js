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

  // Check for malformed parameters in location syntax
  if (/\[location:[^(]*\(\s*\)/.test(text) || /\[location:[^(]*\([^)]*\([^)]*\)[^)]*\)/.test(text)) {
    return null;
  }

  // Check for any location syntax - if found, only allow explicit or parameterized patterns
  if (text.includes('[location:')) {
    // Try parameterized first
    const paramMatch = text.match(/\[location:([^(]+)\(([^)]+)\)\]/i);
    if (paramMatch) {
      const name = paramMatch[1].trim();
      const paramStr = paramMatch[2].trim();
      
      if (!name) return null;
      
      // Special case for "floor 3" format
      if (paramStr.match(/^floor\s+\d+$/i)) {
        return {
          type: 'location',
          value: {
            name,
            type: inferLocationType(name),
            parameters: {
              floor: paramStr.split(/\s+/)[1]
            }
          },
          metadata: {
            confidence: Confidence.HIGH,
            pattern: 'parameterized_location',
            originalMatch: paramMatch[0]
          }
        };
      }
      
      const params = parseParameters(paramStr);
      if (!params) return null;

      return {
        type: 'location',
        value: {
          name,
          type: inferLocationType(name),
          parameters: params
        },
        metadata: {
          confidence: Confidence.HIGH,
          pattern: 'parameterized_location',
          originalMatch: paramMatch[0]
        }
      };
    }

    // Try explicit if no parameterized match
    const explicitMatch = text.match(/\[location:([^()\]]+)\]/i);
    if (explicitMatch) {
      const name = explicitMatch[1].trim();
      if (!name) return null;

      const confidence = Confidence.HIGH;
      return {
        type: 'location',
        value: {
          name,
          type: inferLocationType(name)
        },
        metadata: {
          confidence,
          pattern: 'explicit_location',
          originalMatch: explicitMatch[0]
        }
      };
    }

    // If we got here, the location syntax is invalid
    return null;
  }

  // If no location syntax, try other patterns
  const patterns = {
    room_location: /(?:(?:in|at)\s+(?:the\s+)?)?(?:room|conference room|meeting room)\s+([A-Za-z0-9-]+)\b/i,
    office_location: /(?:(?:in|at)\s+(?:the\s+)?)?(?:office)\s+([A-Za-z0-9-]+)\b/i,
    building_location: /(?:(?:in|at)\s+(?:the\s+)?)?(?:building)\s+([A-Za-z0-9-]+)\b/i,
    inferred_location: /\b(?:in|at)\s+(?:the\s+)?([^,.]+?)(?:[,.]|\s|$)/i
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
          originalMatch = `Room ${roomNumber}`;
          value = {
            name: originalMatch,
            type: 'room'
          };
          break;
        }

        case 'office_location': {
          const officeNumber = match[1].trim();
          if (!officeNumber) continue;

          confidence = Confidence.MEDIUM;
          originalMatch = `Office ${officeNumber}`;
          value = {
            name: originalMatch,
            type: 'office'
          };
          break;
        }

        case 'building_location': {
          const buildingId = match[1].trim();
          if (!buildingId) continue;

          confidence = Confidence.MEDIUM;
          originalMatch = `Building ${buildingId}`;
          value = {
            name: originalMatch,
            type: 'building'
          };
          break;
        }

        case 'inferred_location': {
          const name = match[1].trim();
          if (!name) continue;

          confidence = Confidence.LOW;
          originalMatch = match[0];
          value = {
            name,
            type: inferLocationType(name)
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
