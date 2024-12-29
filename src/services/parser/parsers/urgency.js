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

function formatUrgency(urgencyInfo) {
    if (urgencyInfo.timeBased) {
        return urgencyInfo.originalMatch.toLowerCase();
    }
    return `${urgencyInfo.level} priority`;
}

export async function perfect(text) {
    const validationError = validateParserInput(text, 'UrgencyParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for time-based urgency
        for (const pattern of TIME_URGENCY_PATTERNS) {
            const timeMatch = text.match(pattern);
            if (timeMatch) {
                const urgencyInfo = {
                    level: 'high',
                    score: URGENCY_LEVELS.high,
                    timeBased: true,
                    pattern: 'time_urgency',
                    confidence: Confidence.HIGH,
                    originalMatch: timeMatch[0]
                };

                const correction = {
                    type: 'urgency',
                    original: urgencyInfo.originalMatch,
                    correction: formatUrgency(urgencyInfo),
                    position: {
                        start: text.indexOf(urgencyInfo.originalMatch),
                        end: text.indexOf(urgencyInfo.originalMatch) + urgencyInfo.originalMatch.length
                    },
                    confidence: 'HIGH'
                };

                // Apply correction
                const before = text.substring(0, correction.position.start);
                const after = text.substring(correction.position.end);
                const perfectedText = before + correction.correction + after;

                return {
                    text: perfectedText,
                    corrections: [correction]
                };
            }
        }

        // Check for urgency keywords
        for (const [keyword, level] of Object.entries(URGENCY_KEYWORDS)) {
            const keywordMatch = text.match(new RegExp(`\\b${keyword}\\b`, 'i'));
            if (keywordMatch) {
                const urgencyInfo = {
                    level,
                    score: URGENCY_LEVELS[level],
                    keyword: keyword.toLowerCase(),
                    pattern: 'keyword_urgency',
                    confidence: Confidence.MEDIUM,
                    originalMatch: keywordMatch[0]
                };

                const correction = {
                    type: 'urgency',
                    original: urgencyInfo.originalMatch,
                    correction: formatUrgency(urgencyInfo),
                    position: {
                        start: text.indexOf(urgencyInfo.originalMatch),
                        end: text.indexOf(urgencyInfo.originalMatch) + urgencyInfo.originalMatch.length
                    },
                    confidence: 'MEDIUM'
                };

                // Apply correction
                const before = text.substring(0, correction.position.start);
                const after = text.substring(correction.position.end);
                const perfectedText = before + correction.correction + after;

                return {
                    text: perfectedText,
                    corrections: [correction]
                };
            }
        }

        return {
            text,
            corrections: []
        };
    } catch (error) {
        logger.error('Error in urgency parser:', error);
        throw error;
    }
}
