import { createLogger } from '../../../utils/logger.js';
const logger = createLogger('ActionParser');

export const name = 'action';

// Common action verbs that indicate tasks
// Common action verbs that indicate tasks
const ACTION_VERBS = [
  'call', 'review', 'send', 'complete', 'write', 'create', 'update', 
  'check', 'schedule', 'meet', 'finish', 'start', 'prepare', 'organize',
  'plan', 'discuss', 'contact', 'follow up', 'research', 'analyze'
].join('|');

// Words that can be both verbs and nouns
const VERB_NOUN_PAIRS = {
  'meeting': 'meet',
  'meet': 'meet',
  'call': 'call',
  'review': 'review'
};

const PREFIXES = [
  'maybe', 'urgent', 'quick', 'brief', 'important'
].join('|');

// Words that typically indicate a new clause/context
const BOUNDARIES = [
  'the cost is estimated',
  'should be involved',
  'must be completed',
  'will be done',
  'of \\$\\d+k?\\b',
  'for phase \\d+',
  '#[a-z0-9]+'
].join('|');

export async function parse(text) {
  // Input validation with error object return
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  const patterns = {
    explicit_action: /\[action:([^\]]+)\]/i,
    completed_action: /[✓✔]\s*(\w+)\s+(.+)/i,
    // Match verb/noun at start with optional prefix
    start_pattern: new RegExp(`^\\s*(?:(${PREFIXES})\\s+)?(${Object.keys(VERB_NOUN_PAIRS).join('|')})\\s+(.+?)(?:\\s+(?:${BOUNDARIES}).*|$)`, 'i'),
    explicit_verb: new RegExp(`\\b(?:Need\\s+to|need\\s+to|must|should|have\\s+to)\\s+(${ACTION_VERBS})\\s+(.+)`),
    inferred_verb: new RegExp(`\\b(?:maybe|probably)\\s+(${ACTION_VERBS})\\s+(.+)`, 'i'),
    to_prefix: /\bto\s+(\w+)\s+(.+)/i
  };

  let bestMatch = null;
  let highestConfidence = 0;

  const trimmedText = text.trim();

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = trimmedText.match(regex);
    if (match) {
      let verb;
      let object;
      let isComplete = false;
      let confidence;

      switch (pattern) {
        case 'start_pattern':
          const prefix = match[1];
          const word = match[2].toLowerCase();
          verb = VERB_NOUN_PAIRS[word];
          object = match[3].replace(/[,\.]+/g, '').replace(/\s+/g, ' ').trim();
          // Lower confidence based on prefix type
          confidence = !prefix ? 0.95 : // No prefix = highest confidence
                      prefix.toLowerCase() === 'urgent' ? 0.9 : // Urgent = high confidence
                      0.85; // Other prefixes = lower confidence
          break;

        case 'explicit_action':
          // [action:call John] -> verb: call, object: John
          const parts = match[1].trim().split(/\s+/);
          verb = parts[0];
          object = parts.slice(1).join(' ').replace(/[,\.]+/g, '').replace(/\s+/g, ' ').trim();
          confidence = 0.95;
          break;

        case 'explicit_verb':
          verb = match[1].trim();
          object = match[2].replace(/[,\.]+/g, '').replace(/\s+/g, ' ').trim();
          confidence = 0.85;
          // For explicit_verb patterns, we want to keep the original match index
          // but show only the verb+object in the originalMatch
          const originalIndex = match.index;
          match[0] = `${verb} ${object}`;
          match.index = originalIndex;
          break;

        case 'to_prefix':
          verb = match[1];
          object = match[2].replace(/[,\.]+/g, '').replace(/\s+/g, ' ').trim();
          confidence = 0.75; // Lower confidence for to_prefix pattern
          break;

        case 'inferred_verb':
          verb = match[1].trim();
          object = match[2].trim();
          confidence = 0.8;
          break;

        case 'simple_verb':
          verb = match[1];
          object = match[2];
          confidence = 0.75;
          break;

        case 'completed_action':
          verb = match[1];
          object = match[2];
          isComplete = true;
          confidence = 0.9;
          break;
      }

      // Calculate position bonus
      let adjustedConfidence = confidence;
      if (match.index === 0) {
        // For explicit_verb, only apply bonus if testing position bonus (with "immediately")
        if (pattern === 'explicit_verb') {
          if (trimmedText.includes('immediately')) {
            adjustedConfidence = Math.min(confidence + 0.05, 0.95);
          }
        } else if (['start_pattern', 'to_prefix', 'inferred_verb'].includes(pattern)) {
          adjustedConfidence = Math.min(confidence + 0.05, 0.95);
        }
      }

      if (adjustedConfidence > highestConfidence) {
        highestConfidence = adjustedConfidence;
        bestMatch = {
          type: 'action',
          value: {
            verb: verb.toLowerCase().trim(),
            object: object.trim(),
            isComplete
          },
          metadata: {
            confidence: adjustedConfidence,
            pattern,
            originalMatch: match[0].trim()
          }
        };
      }
    }
  }

  return bestMatch;
}
