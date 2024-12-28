import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('UrgencyParser');

export const name = 'urgency';

const URGENCY_LEVELS = {
    high: 3,
    medium: 2,
    low: 1
};

const URGENCY_KEYWORDS = {
    urgent: 'high',
    critical: 'high',
    important: 'high',
    priority: 'high',
    moderate: 'medium',
    normal: 'medium',
    standard: 'medium',
    low: 'low',
    minor: 'low',
    routine: 'low'
};

const TIME_URGENCY_PATTERNS = [
    /\basap\b/i,
    /\bimmediately\b/i,
    /\bright away\b/i,
    /\bright now\b/i,
    /\bas soon as possible\b/i
];

function validateUrgencyLevel(level) {
    return level && typeof level === 'string' && level.toLowerCase() in URGENCY_LEVELS;
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'UrgencyParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for time-based urgency
        for (const pattern of TIME_URGENCY_PATTERNS) {
            const timeMatch = text.match(pattern);
            if (timeMatch) {
                return {
                    type: 'urgency',
                    value: {
                        level: 'high',
                        score: URGENCY_LEVELS.high,
                        timeBased: true
                    },
                    metadata: {
                        pattern: 'time_urgency',
                        confidence: Confidence.HIGH,
                        originalMatch: timeMatch[0]
                    }
                };
            }
        }

        // Check for urgency keywords
        for (const [keyword, level] of Object.entries(URGENCY_KEYWORDS)) {
            const keywordMatch = text.match(new RegExp(`\\b${keyword}\\b`, 'i'));
            if (keywordMatch) {
                return {
                    type: 'urgency',
                    value: {
                        level,
                        score: URGENCY_LEVELS[level],
                        keyword: keyword.toLowerCase()
                    },
                    metadata: {
                        pattern: 'keyword_urgency',
                        confidence: Confidence.MEDIUM,
                        originalMatch: keywordMatch[0]
                    }
                };
            }
        }

        return null;
    } catch (error) {
        logger.error('Error in urgency parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
