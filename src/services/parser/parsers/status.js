import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('StatusParser');

export const name = 'status';

const STATUS_LEVELS = {
    pending: 0,
    started: 1,
    blocked: 2,
    completed: 3,
    cancelled: 4
};

const STATUS_MAPPINGS = {
    waiting: 'blocked',
    done: 'completed',
    finished: 'completed',
    cancelled: 'cancelled'  // Added explicit mapping
};

function validateStatus(status) {
    if (!status || typeof status !== 'string') return false;
    const normalized = STATUS_MAPPINGS[status.toLowerCase()] || status.toLowerCase();
    return normalized in STATUS_LEVELS;
}

function validateProgress(progress) {
    return progress >= 0 && progress <= 100;
}

function normalizeStatus(status) {
    return STATUS_MAPPINGS[status.toLowerCase()] || status.toLowerCase();
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'StatusParser');
    if (validationError) {
        return validationError;
    }

    try {
        const patterns = {
            state: /\b(?:is|marked\s+as)\s+([a-z]+)\b/i,
            progress: /\b(\d+)%\s*(?:complete|done|finished)\b/i,
            contextual: /\b(waiting|done|finished|cancelled)\b/i
        };

        let bestMatch = null;

        for (const [pattern, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                let confidence;
                let value;

                if (pattern === 'progress') {
                    const progress = parseInt(match[1], 10);
                    if (!validateProgress(progress)) {
                        continue;
                    }
                    confidence = Confidence.MEDIUM;
                    value = { progress };
                } else {
                    const status = match[1].toLowerCase();
                    const normalized = normalizeStatus(status);
                    if (!validateStatus(status)) {
                        continue;
                    }
                    value = { status: normalized };

                    switch (pattern) {
                        case 'state':
                            confidence = Confidence.HIGH;
                            break;
                        case 'contextual':
                            confidence = Confidence.MEDIUM;
                            break;
                    }
                }

                // Update if current confidence is higher or equal priority pattern
                const shouldUpdate = !bestMatch || 
                    (confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
                    (confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW);
                
                if (shouldUpdate) {
                    bestMatch = {
                        type: 'status',
                        value,
                        metadata: {
                            confidence,
                            pattern,
                            originalMatch: match[0],
                            level: value.status ? STATUS_LEVELS[value.status] : undefined
                        }
                    };
                }
            }
        }

        return bestMatch;
    } catch (error) {
        logger.error('Error in status parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
