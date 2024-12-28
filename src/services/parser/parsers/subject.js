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

export async function perfect(text) {
    const validationError = validateParserInput(text, 'SubjectParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    // Check for invalid characters
    if (/[\0\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
        return { text, corrections: [] };
    }

    try {
        // Find the main subject by cleaning up metadata
        const { text: cleanText, removedParts } = cleanupText(text);
        if (!validateSubject(cleanText)) {
            return { text, corrections: [] };
        }

        // Improve the subject text
        const improvedText = improveSubject(cleanText);
        if (improvedText === cleanText) {
            return { text, corrections: [] };
        }

        // Create correction record
        const correction = {
            type: 'subject_improvement',
            original: cleanText,
            correction: improvedText,
            position: {
                start: text.indexOf(cleanText),
                end: text.indexOf(cleanText) + cleanText.length
            },
            confidence: calculateConfidence(cleanText, improvedText)
        };

        // Apply the correction to the text
        const before = text.substring(0, correction.position.start);
        const after = text.substring(correction.position.end);
        const perfectedText = before + improvedText + after;

        return {
            text: perfectedText,
            corrections: [correction]
        };

    } catch (error) {
        logger.error('Error in subject parser:', error);
        return { text, corrections: [] };
    }
}

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

function improveSubject(text) {
    // Split into words while preserving case
    const words = text.split(/\s+/);
    const improvedWords = words.map((word, index) => {
        // Preserve acronyms and technical terms
        if (word === word.toUpperCase() && word.length > 1) {
            return word;
        }
        
        // Capitalize first word
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }

        // Handle proper nouns (words that are already capitalized)
        if (word.charAt(0) === word.charAt(0).toUpperCase()) {
            return word;
        }

        // Convert other words to lowercase
        return word.toLowerCase();
    });

    // Remove redundant words
    const uniqueWords = [];
    const seenWords = new Set();
    for (const word of improvedWords) {
        const lower = word.toLowerCase();
        if (!STOP_WORDS.has(lower) && !seenWords.has(lower)) {
            uniqueWords.push(word);
            seenWords.add(lower);
        }
    }

    return uniqueWords.join(' ');
}

function validateSubject(text) {
    if (text.length < 2) return false;
    const firstWord = text.split(/\s+/)[0].toLowerCase();
    return !INVALID_START_WORDS.has(firstWord);
}

function calculateConfidence(original, improved) {
    // Higher confidence if significant improvements were made
    const originalWords = original.split(/\s+/);
    const improvedWords = improved.split(/\s+/);
    
    if (improvedWords.length < originalWords.length) {
        return Confidence.HIGH; // Removed redundant words
    }
    
    if (improved !== original.toLowerCase() && improved !== original.toUpperCase()) {
        return Confidence.HIGH; // Case improvements
    }
    
    return Confidence.MEDIUM;
}
