import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';

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
    /\b(?:priority:\s*(?:high|medium|low))\b/i
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

    // Handle standard cleanup patterns
    for (const pattern of CLEANUP_PATTERNS) {
        cleanText = cleanText.replace(pattern, (match) => {
            removedParts.push(match.trim());
            return ' ';
        });
    }

    // Handle tags and mentions separately
    for (const pattern of TAG_PATTERNS) {
        cleanText = cleanText.replace(pattern, (match) => {
            removedParts.push(match.trim());
            return ' ';
        });
    }

    // Clean up extra spaces
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

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

function isValidExplicitSubject(text) {
    const match = text.match(/^\[subject:([^\]]+)\]$/i);
    if (!match) return false;
    
    const subject = match[1].trim();
    return validateSubject(subject);
}

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    // Check for invalid characters
    if (/[\0\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: 'Text contains invalid characters'
        };
    }

    try {
        // Check for explicit subject pattern
        if (text.includes('[subject:')) {
            // Must be a complete, well-formed explicit subject
            if (!text.match(/^\[subject:[^\]]+\]$/i)) {
                return null;
            }

            const match = text.match(/^\[subject:([^\]]+)\]$/i);
            const subjectText = match[1].trim();
            if (!validateSubject(subjectText)) {
                return null;
            }

            const keyTerms = extractKeyTerms(subjectText);
            return {
                type: 'subject',
                value: {
                    text: subjectText,
                    keyTerms
                },
                metadata: {
                    confidence: Confidence.HIGH,
                    pattern: 'explicit',
                    originalMatch: text,
                    hasActionVerb: keyTerms.some(term => ACTION_VERBS.has(term))
                }
            };
        }

        // If text contains any subject-like patterns but didn't match explicit format, reject it
        if (text.includes('subject:') || text.includes('[subject') || text.includes('subject]')) {
            return null;
        }

        // Clean up text
        const { text: cleanText, removedParts } = cleanupText(text);
        if (!validateSubject(cleanText)) return null;

        const keyTerms = extractKeyTerms(cleanText);
        const hasActionVerb = keyTerms.some(term => ACTION_VERBS.has(term));

        return {
            type: 'subject',
            value: {
                text: cleanText,
                keyTerms
            },
            metadata: {
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
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
