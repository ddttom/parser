import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('DependenciesParser');

export const name = 'dependencies';

const RELATIONSHIP_TYPES = {
  'depends on': 'depends_on',
  'blocks': 'blocks',
  'after': 'after'
};

export async function parse(text) {
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  function validateTaskId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }

  const patterns = {
    explicit_dependency: /\b(depends\s+on)\s+\[task:([^\]]+)\]/i,
    multiple_dependencies: /\b(after)\s+\[task:([^\]]+)\]\s+and\s+\[task:([^\]]+)\]/i,
    relationship_dependency: /\b(blocks)\s+\[task:([^\]]+)\]/i,
    implicit_dependency: /\b(after)\s+task\s+([a-zA-Z0-9_-]+)\b/i
  };

  let bestMatch = null;
  let highestConfidence = 0;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      // Validate task IDs
      const taskIds = match.slice(2);
      const hasInvalidId = taskIds.some(id => !validateTaskId(id?.trim()));
      if (hasInvalidId) {
        continue;
      }

      switch (pattern) {
        case 'explicit_dependency': {
          confidence = 0.95;
          value = {
            type: 'task',
            id: match[2],
            relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
          };
          break;
        }

        case 'multiple_dependencies': {
          confidence = 0.9;
          value = {
            dependencies: [
              {
                type: 'task',
                id: match[2],
                relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
              },
              {
                type: 'task',
                id: match[3],
                relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
              }
            ]
          };
          break;
        }

        case 'relationship_dependency': {
          confidence = 0.9;
          value = {
            type: 'task',
            id: match[2],
            relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
          };
          break;
        }

        case 'implicit_dependency': {
          confidence = 0.75;
          value = {
            type: 'task',
            id: match[2],
            relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
          };
          break;
        }
      }

      if (confidence > highestConfidence) {
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
