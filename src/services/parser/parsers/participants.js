import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ParticipantsParser');

export const name = 'participants';

function parseParameters(paramStr) {
  if (!paramStr || !paramStr.includes('=')) return null;
  
  try {
    const params = {};
    paramStr.split(/\s+/).forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[key] = value;
      }
    });
    return Object.keys(params).length > 0 ? params : null;
  } catch (error) {
    return null;
  }
}

function validateParticipantName(name) {
  return /^[A-Za-z][A-Za-z\s]*[A-Za-z]$/.test(name);
}

function validateRole(role) {
  return /^[A-Za-z]+$/.test(role) || /^[A-Za-z]+=[A-Za-z]+$/.test(role);
}

function extractParticipants(text) {
  // First replace "and" with comma to standardize the format
  text = text.replace(/\s+and\s+/g, ', ');
  
  // Split on commas and clean up each part
  return text
    .split(/\s*,\s*/)
    .map(p => p.trim())
    .filter(p => validateParticipantName(p));
}

function findNaturalList(text) {
  // Look for a list after "with", "includes", or "has" that contains commas
  const withMatch = text.match(/(?:with|includes?|has)\s+([A-Za-z][A-Za-z\s]*,\s*[A-Za-z][A-Za-z\s]*(?:\s*,\s*[A-Za-z][A-Za-z\s]*)*\s*,?\s*and\s+[A-Za-z][A-Za-z\s]*)\b/i);
  if (withMatch) {
    const listPart = withMatch[1];
    const participants = extractParticipants(listPart);
    if (participants.length >= 2) {
      return {
        match: listPart,
        participants,
        confidence: 0.85
      };
    }
  }

  // Look for a list after "with" (simpler pattern)
  const implicitMatch = text.match(/\bwith\s+([A-Za-z][A-Za-z\s]*(?:\s+and\s+[A-Za-z][A-Za-z\s]*)?)\b/i);
  if (implicitMatch) {
    const listPart = implicitMatch[1];
    const participants = extractParticipants(listPart);
    if (participants.length > 0) {
      return {
        match: listPart,
        participants,
        confidence: 0.7
      };
    }
  }

  return null;
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
    parameterized_list: /\[participants:([^\]]+(?:\([^)]+\))[^\]]*)\]/i,
    explicit_list: /\[participants:([^\]]+)\]/i,
    role_assignment: /(\w+)\s*\((\w+)\)(?:\s*(?:and|,)\s*(\w+)\s*\((\w+)\))?/i,
    mentions: /@(\w+)(?:\s*(?:and|,)\s*@(\w+))?/i
  };

  // Try natural list patterns first
  if (!text.match(/\[participants:/i) && !text.match(/\w+\s*\([^)]+\)/)) {
    const naturalList = findNaturalList(text);
    if (naturalList) {
      return {
        type: 'participants',
        value: {
          participants: naturalList.participants,
          count: naturalList.participants.length
        },
        metadata: {
          confidence: naturalList.confidence,
          pattern: naturalList.confidence === 0.85 ? 'natural_list' : 'implicit',
          originalMatch: naturalList.match
        }
      };
    }
  }

  let bestMatch = null;
  let highestConfidence = 0;

  // Process other patterns in priority order
  const patternOrder = [
    'parameterized_list',
    'explicit_list',
    'role_assignment',
    'mentions'
  ];

  for (const pattern of patternOrder) {
    const regex = patterns[pattern];
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      switch (pattern) {
        case 'parameterized_list': {
          const participantMatches = match[1].match(/(\w+)\(([^)]+)\)/g);
          if (!participantMatches) continue;

          const participants = [];
          for (const pMatch of participantMatches) {
            const [_, name, paramStr] = pMatch.match(/(\w+)\(([^)]+)\)/);
            if (!validateParticipantName(name)) continue;
            
            const parameters = parseParameters(paramStr);
            if (!parameters) continue;

            participants.push({ name, parameters });
          }

          if (participants.length === 0) continue;

          confidence = 0.95;
          value = {
            participants,
            count: participants.length
          };
          break;
        }

        case 'explicit_list': {
          // Skip if this looks like a parameterized list
          if (text.match(/\[participants:.*\([^)]+\)/i)) continue;

          const participants = extractParticipants(match[1]);
          if (participants.length === 0) continue;

          confidence = 0.95;
          value = {
            participants,
            count: participants.length
          };
          break;
        }

        case 'role_assignment': {
          // Skip if this looks like a parameterized list
          if (text.match(/\[participants:.*\([^)]+\)/i)) continue;

          const participants = [];
          
          if (match[1] && match[2] && validateParticipantName(match[1]) && validateRole(match[2])) {
            participants.push({
              name: match[1],
              role: match[2]
            });
          }
          
          if (match[3] && match[4] && validateParticipantName(match[3]) && validateRole(match[4])) {
            participants.push({
              name: match[3],
              role: match[4]
            });
          }

          if (participants.length === 0) continue;

          confidence = 0.9;
          value = {
            participants,
            count: participants.length
          };
          break;
        }

        case 'mentions': {
          // Skip if this looks like a parameterized list or role assignment
          if (text.match(/\[participants:.*\([^)]+\)/i) || text.match(/\w+\s*\([^)]+\)/)) continue;

          const participants = [match[1]]
            .concat(match[2] ? [match[2]] : [])
            .filter(p => validateParticipantName(p))
            .map(p => p.toLowerCase());

          if (participants.length === 0) continue;

          confidence = 0.9;
          value = {
            participants,
            count: participants.length
          };
          break;
        }
      }

      // Apply position bonus only for explicit patterns
      if (match.index === 0 && ['parameterized_list', 'explicit_list'].includes(pattern)) {
        confidence = Math.min(confidence + 0.05, 0.95);
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
