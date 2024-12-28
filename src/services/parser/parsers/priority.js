import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('PriorityParser');

export const name = 'priority';

const PRIORITY_LEVELS = {
    critical: 'Critical Priority',
    urgent: 'Urgent Priority',
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
    none: 'No Priority'
};

const PRIORITY_ALIASES = {
    highest: 'critical',
    important: 'high',
    normal: 'medium',
    minor: 'low',
    asap: 'urgent',
    p0: 'critical',
    p1: 'high',
    p2: 'medium',
    p3: 'low',
    blocker: 'critical',
    critical: 'critical',
    major: 'high',
    moderate: 'medium',
    trivial: 'low'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'PriorityParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try hashtag pattern first
        const hashtagMatch = findPriorityHashtag(text);
        if (hashtagMatch) {
            const correction = {
                type: 'priority_hashtag_improvement',
                original: hashtagMatch.match,
                correction: formatPriorityHashtag(hashtagMatch),
                position: {
                    start: text.indexOf(hashtagMatch.match),
                    end: text.indexOf(hashtagMatch.match) + hashtagMatch.match.length
                },
                confidence: hashtagMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try keyword pattern
        const keywordMatch = findPriorityKeyword(text);
        if (keywordMatch) {
            const correction = {
                type: 'priority_improvement',
                original: keywordMatch.match,
                correction: formatPriorityKeyword(keywordMatch),
                position: {
                    start: text.indexOf(keywordMatch.match),
                    end: text.indexOf(keywordMatch.match) + keywordMatch.match.length
                },
                confidence: keywordMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try implicit pattern
        const implicitMatch = findImplicitPriority(text);
        if (implicitMatch) {
            const correction = {
                type: 'priority_improvement',
                original: implicitMatch.match,
                correction: formatImplicitPriority(implicitMatch),
                position: {
                    start: text.indexOf(implicitMatch.match),
                    end: text.indexOf(implicitMatch.match) + implicitMatch.match.length
                },
                confidence: implicitMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        return { text, corrections: [] };

    } catch (error) {
        logger.error('Error in priority parser:', error);
        return { text, corrections: [] };
    }
}

function findPriorityHashtag(text) {
    const priorityTerms = [...Object.keys(PRIORITY_LEVELS), ...Object.keys(PRIORITY_ALIASES)].join('|');
    const pattern = new RegExp(`#(${priorityTerms})(?:-priority)?\\b`, 'i');
    const match = text.match(pattern);
    if (!match) return null;

    const priority = match[1];
    if (!validatePriority(priority)) return null;

    return {
        match: match[0],
        priority,
        confidence: Confidence.HIGH
    };
}

function findPriorityKeyword(text) {
    const priorityTerms = [...Object.keys(PRIORITY_LEVELS), ...Object.keys(PRIORITY_ALIASES)].join('|');
    const pattern = new RegExp(`\\b(${priorityTerms})\\s+priority\\b(?:\\s+task)?`, 'i');
    const match = text.match(pattern);
    if (!match) return null;

    const priority = match[1];
    if (!validatePriority(priority)) return null;

    return {
        match: match[0],
        priority,
        confidence: Confidence.HIGH
    };
}

function findImplicitPriority(text) {
    const priorityTerms = [...Object.keys(PRIORITY_LEVELS), ...Object.keys(PRIORITY_ALIASES)].join('|');
    const pattern = new RegExp(`\\b(${priorityTerms})\\b(?!\\s+priority)`, 'i');
    const match = text.match(pattern);
    if (!match) return null;

    const priority = match[1];
    if (!validatePriority(priority)) return null;

    return {
        match: match[0],
        priority,
        confidence: Confidence.MEDIUM
    };
}

function formatPriorityHashtag({ priority }) {
    const normalized = normalizePriority(priority);
    return `#${PRIORITY_LEVELS[normalized].replace(/\s+/g, '')}`;
}

function formatPriorityKeyword({ priority, match }) {
    const normalized = normalizePriority(priority);
    const formatted = PRIORITY_LEVELS[normalized];
    
    // If original included "task", preserve it
    if (match.toLowerCase().includes('task')) {
        return `${formatted} Task`;
    }
    return formatted;
}

function formatImplicitPriority({ priority }) {
    const normalized = normalizePriority(priority);
    return PRIORITY_LEVELS[normalized];
}

function normalizePriority(priority) {
    priority = priority.toLowerCase();
    return PRIORITY_ALIASES[priority] || priority;
}

function validatePriority(priority) {
    const normalized = normalizePriority(priority);
    return normalized in PRIORITY_LEVELS;
}
