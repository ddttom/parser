import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('DependenciesParser');

export const name = 'dependencies';

const RELATIONSHIP_TYPES = {
  'depends on': 'depends_on',
  'blocks': 'blocks',
  'after': 'after'
};

export async function parse(text) {
  const validationError = validateParserInput(text, 'DependenciesParser');
  if (validationError) {
    return validationError;
  }

  function validateTaskId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }

  const patterns = {
    natural_dependency: /\b(depends\s+on)\s+(?:task\s+)?([a-zA-Z0-9_-]+)\b/i,
    multiple_dependencies: /\b(after)\s+(?:tasks?\s+)?([a-zA-Z0-9_-]+)\s+and\s+([a-zA-Z0-9_-]+)\b/i,
    relationship_dependency: /\b(blocks)\s+(?:task\s+)?([a-zA-Z0-9_-]+)\b/i,
    implicit_dependency: /\b(after)\s+(?:task\s+)?([a-zA-Z0-9_-]+)\b/i
  };

  let bestMatch = null;

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
        case 'natural_dependency': {
          confidence = Confidence.HIGH;
          value = {
            type: 'task',
            id: match[2],
            relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
          };
          break;
        }

        case 'multiple_dependencies': {
          confidence = Confidence.HIGH;
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
          confidence = Confidence.HIGH;
          value = {
            type: 'task',
            id: match[2],
            relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
          };
          break;
        }

        case 'implicit_dependency': {
          confidence = Confidence.MEDIUM;
          value = {
            type: 'task',
            id: match[2],
            relationship: RELATIONSHIP_TYPES[match[1].toLowerCase()]
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
          dependencies: {
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
