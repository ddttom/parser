import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ProjectParser');

export const name = 'project';

const IGNORED_TERMS = new Set(['the', 'this', 'new', 'project']);

const PROJECT_INDICATORS = {
  project_term: ['project', 'initiative', 'program'],
  task_organization: ['under', 'for', 'in', 'story'],
  stakeholder: ['client', 'team', 'department'],
  timeline: ['roadmap', 'milestone', 'sprint']
};

export function validateProjectName(name) {
  if (!name || typeof name !== 'string') return false;
  
  // Length validation
  if (name.length <= 1 || name.length > 50) return false;
  
  // Must start with a letter or be a number (for PRJ-123 style identifiers)
  if (!/^[a-zA-Z0-9]/.test(name)) return false;

  // Allow alphanumeric with spaces, hyphens, underscores
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_\s-]*[a-zA-Z0-9]$/.test(name)) return false;
  
  // Ignore common terms and monetary values
  // Only check ignored terms against lowercase version
  if (IGNORED_TERMS.has(name.toLowerCase()) || /^\d+k?$/i.test(name) || name.toLowerCase().includes('cost')) return false;
  
  return true;
}

function detectIndicators(text) {
  const indicators = [];
  const lowerText = text.toLowerCase();

  for (const [type, terms] of Object.entries(PROJECT_INDICATORS)) {
    if (terms.some(term => lowerText.includes(term))) {
      indicators.push(type);
    }
  }

  return indicators;
}

export async function parse(text) {
  const validationError = validateParserInput(text, 'ProjectParser');
  if (validationError) {
    return validationError;
  }

  try {
    // Detect indicators first
    const indicators = detectIndicators(text);

    const patterns = {
      reference: /\bre:\s*(?:project\s+)?([^\s\n]+)/i,
      identifier: /PRJ-(\d+)\b/i,
      shorthand: /\$([A-Za-z][A-Za-z0-9_-]*)/,
      contextual: /\b(?:project|initiative|program)\s+([A-Za-z][A-Za-z0-9_\s-]*[A-Za-z0-9])\b/i,
      regarding: /\bregarding\s+(?:project\s+)?([A-Za-z][A-Za-z0-9_\s-]*[A-Za-z0-9])\b/i,
      inferred: /\b(?:for|in|under)\s+([A-Za-z][A-Za-z0-9_\s-]*[A-Za-z0-9])\s+(?:project|initiative|program)\b/i
    };

    let bestMatch = null;
    let highestConfidence = Confidence.LOW;

    for (const [pattern, regex] of Object.entries(patterns)) {
      const match = text.match(regex);
      if (match) {
        let confidence;
        let value;
        const projectName = match[1] || '';

        // Skip empty project names
        if (!projectName) continue;

        // Validate project name (except for identifiers)
        if (pattern !== 'identifier') {
          const isValid = parse.validateProjectName(projectName);
          if (!isValid) continue;
        }

        switch (pattern) {
          case 'reference':
          case 'shorthand': {
            confidence = Confidence.HIGH;
            value = {
              project: projectName,
              originalName: projectName
            };
            break;
          }

          case 'identifier': {
            confidence = Confidence.HIGH;
            value = {
              project: projectName,
              originalName: `PRJ-${projectName}`
            };
            break;
          }

          case 'contextual': {
            confidence = Confidence.MEDIUM;
            value = {
              project: projectName,
              originalName: projectName
            };
            break;
          }

          case 'regarding':
          case 'inferred': {
            confidence = Confidence.MEDIUM;
            value = {
              project: projectName,
              originalName: projectName
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
            project: {
              ...value,
              confidence,
              pattern,
              originalMatch: match[0],
              indicators
            }
          };
        }
      }
    }

    return bestMatch;
  } catch (error) {
    logger.error('Error in project parser:', error);
    return {
      project: {
        error: 'PARSER_ERROR',
        message: error.message
      }
    };
  }
}

// Make functions available for mocking in tests
parse.validateProjectName = validateProjectName;
