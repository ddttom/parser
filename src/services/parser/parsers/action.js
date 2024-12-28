import { createLogger } from '../../../utils/logger.js';
import { validateParserInput } from '../utils/validation.js';
import { Confidence } from '../utils/confidence.js';

const logger = createLogger('ActionParser');

export const name = 'action';

// Common action verbs that indicate tasks
const ACTION_VERBS = [
  'call', 'review', 'send', 'complete', 'write', 'create', 'update', 
  'check', 'schedule', 'meet', 'finish', 'start', 'prepare', 'organize',
  'plan', 'discuss', 'contact', 'follow up', 'research', 'analyze'
].join('|');

// Words that can be both verbs and nouns
const VERB_NOUN_PAIRS = {
  'meeting': 'meet with',
  'meet': 'meet with',
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

export async function perfect(text) {
  const validationError = validateParserInput(text, 'ActionParser');
  if (validationError) {
    return { text, corrections: [] };
  }

  const patterns = {
    completed_action: /[✓✔]\s*(\w+)\s+(.+)/i,
    start_pattern: new RegExp(`^\\s*(?:(${PREFIXES})\\s+)?(${Object.keys(VERB_NOUN_PAIRS).join('|')})\\s+(.+?)(?:\\s+(?:${BOUNDARIES}).*|$)`, 'i'),
    explicit_verb: new RegExp(`\\b(?:Need\\s+to|need\\s+to|must|should|have\\s+to)\\s+(${ACTION_VERBS})\\s+(.+)`),
    inferred_verb: new RegExp(`\\b(?:maybe|probably)\\s+(${ACTION_VERBS})\\s+(.+)`, 'i'),
    to_prefix: /\bto\s+(\w+)\s+(.+)/i
  };

  let bestMatch = null;
  let highestConfidence = 0;
  let corrections = [];

  const trimmedText = text.trim();

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = trimmedText.match(regex);
    if (match) {
      let verb;
      let object;
      let isComplete = false;
      let confidence;
      let improvedText;

      switch (pattern) {
        case 'start_pattern':
          const prefix = match[1];
          const word = match[2].toLowerCase();
          verb = VERB_NOUN_PAIRS[word];
          object = match[3].replace(/[,\.]+/g, '').replace(/\s+/g, ' ').trim();
          confidence = !prefix ? Confidence.HIGH : 
                      prefix.toLowerCase() === 'urgent' ? Confidence.HIGH :
                      Confidence.MEDIUM;
          improvedText = `${verb} ${object}`;
          break;

        case 'explicit_verb':
          verb = match[1].trim();
          object = match[2].replace(/[,\.]+/g, '').replace(/\s+/g, ' ').trim();
          confidence = Confidence.HIGH;
          improvedText = `${verb} ${object}`;
          break;

        case 'to_prefix':
          verb = match[1];
          object = match[2].replace(/[,\.]+/g, '').replace(/\s+/g, ' ').trim();
          confidence = Confidence.MEDIUM;
          improvedText = `${verb} ${object}`;
          break;

        case 'inferred_verb':
          verb = match[1].trim();
          object = match[2].trim();
          confidence = Confidence.MEDIUM;
          improvedText = `${verb} ${object}`;
          break;

        case 'completed_action':
          verb = match[1];
          object = match[2];
          isComplete = true;
          confidence = Confidence.HIGH;
          improvedText = `✓ ${verb} ${object}`;
          break;
      }

      // Calculate position bonus
      if (match.index === 0) {
        confidence = pattern === 'explicit_verb' && trimmedText.includes('immediately') ? 
          Confidence.HIGH : 
          confidence;
      }

      if (confidence === Confidence.HIGH || confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          originalText: match[0],
          improvedText,
          position: {
            start: match.index,
            end: match.index + match[0].length
          },
          confidence,
          pattern
        };
      }
    }
  }

  // If no match found, return original text
  if (!bestMatch) {
    return { text, corrections: [] };
  }

  // Create correction record
  const correction = {
    type: 'action_improvement',
    original: bestMatch.originalText,
    correction: bestMatch.improvedText,
    position: bestMatch.position,
    confidence: bestMatch.confidence
  };

  // Apply the correction to the text
  const before = text.substring(0, bestMatch.position.start);
  const after = text.substring(bestMatch.position.end);
  const perfectedText = before + bestMatch.improvedText + after;

  return {
    text: perfectedText,
    corrections: [correction]
  };
}
