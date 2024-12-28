import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('SubjectParser');

export const name = 'subject';

const INVALID_START_WORDS = new Set(['the', 'a', 'an', 'to', 'in']);

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'to', 'in', 'and', 'but', 'or', 'if', 'then',
    'else', 'when', 'what', 'where', 'how', 'why', 'who', 'with',
    'some', 'for', 'by', 'on', 'at', 'of', 'from'
]);

const ACTION_VERBS = new Set([
    'create', 'update', 'delete', 'review', 'implement',
    'fix', 'add', 'remove', 'change', 'test', 'write',
    'document', 'analyze', 'design', 'develop', 'build',
    'deploy', 'configure', 'optimize', 'refactor', 'debug',
    'submit', 'check', 'verify', 'validate', 'prepare',
    'setup', 'install', 'migrate', 'monitor', 'maintain'
]);

const CLEANUP_PATTERNS = [
    // Time references
    /\b(?:at|from|until)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i,
    // Date references
    /\b(?:on|by|before|after)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:\/|-)\d{1,2}(?:\/|-)\d{2,4})\b/i,
    // Project references
    /\b(?:for|in|under)\s+(?:project\s+)?[a-z0-9_-]+\b/i,
    // Priority markers
    /\b(?:high|medium|low)\s+priority\b/i,
    /\b(?:priority:\s*(?:high|medium|low))\b/i,
    // Location references
    /\b(?:in|at)\s+(?:room|office|building|location)\s+[a-z0-9-]+\b/i,
    // Tomorrow/today references
    /\b(?:tomorrow|today|yesterday)\b/i,
    // Preposition + word combinations
    /\b(?:about|with|for)\s+[a-z0-9_-]+\b/i
];

const TAG_PATTERNS = [
    // Tags
    /\s*#[a-z0-9_-]+\s*/ig,
    // Mentions
    /\s*@[a-z0-9_-]+\s*/ig
];

function cleanupText(text) {
    const removedParts = [];
    let cleanText = text;

    // First collect all matches to preserve order
    const matches = [];
    for (const pattern of CLEANUP_PATTERNS) {
        let match;
        while ((match = pattern.exec(cleanText)) !== null) {
            matches.push({
                text: match[0],
                index: match.index,
                length: match[0].length
            });
        }
    }

    for (const pattern of TAG_PATTERNS) {
        let match;
        while ((match = pattern.exec(cleanText)) !== null) {
            matches.push({
                text: match[0],
                index: match.index,
                length: match[0].length
            });
        }
    }

    // Sort matches by position in reverse order to remove from end to start
    matches.sort((a, b) => b.index - a.index);

    // Remove matches from end to start to preserve indices
    for (const match of matches) {
        removedParts.push(match.text.trim());
        cleanText = cleanText.slice(0, match.index) + ' ' + cleanText.slice(match.index + match.length);
    }

    // Clean up extra spaces and words
    cleanText = cleanText
        .replace(/\s+/g, ' ')
        .replace(/\b(?:about|with|for)\s*$/, '')
        .trim();

    return { text: cleanText, removedParts };
}

function extractKeyTerms(text) {
    const terms = new Set();
    const words = text.toLowerCase().split(/\s+/);

    for (const word of words) {
        if (ACTION_VERBS.has(word)) {
            terms.add(word);
        } else if (word.length > 2 && !STOP_WORDS.has(word)) {
            // Add significant terms (nouns, adjectives, etc.)
            // Handle technical terms (uppercase words)
            const originalWord = text.split(/\s+/).find(w => w.toLowerCase() === word);
            if (originalWord && originalWord === originalWord.toUpperCase()) {
                terms.add(word.toLowerCase());
            } else if (!/^(?:and|but|or|if|then|else|when|what|where|how|why|who)$/i.test(word)) {
                terms.add(word);
            }
        }
    }

    return Array.from(terms);
}

function validateSubject(text) {
    if (text.length < 2) return false;
    const firstWord = text.split(/\s+/)[0].toLowerCase();
    return !INVALID_START_WORDS.has(firstWord);
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'SubjectParser');
    if (validationError) {
        return validationError;
    }

    // Check for invalid characters
    if (/[\0\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
        return {
            subject: {
                error: 'PARSER_ERROR',
                message: 'Text contains invalid characters'
            }
        };
    }

    try {
        // Clean up text
        const { text: cleanText, removedParts } = cleanupText(text);
        if (!validateSubject(cleanText)) return null;

        const keyTerms = extractKeyTerms(cleanText);
        const hasActionVerb = keyTerms.some(term => ACTION_VERBS.has(term));

        return {
            subject: {
                text: cleanText,
                keyTerms,
                confidence: Confidence.MEDIUM,
                pattern: 'inferred',
                originalMatch: text,
                hasActionVerb,
                removedParts
            }
        };
    } catch (error) {
        logger.error('Error in subject parser:', error);
        return {
            subject: {
                error: 'PARSER_ERROR',
                message: error.message
            }
        };
    }
}
