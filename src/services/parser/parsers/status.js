import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('StatusParser');

export const name = 'status';

const STATUS_FORMATS = {
    pending: 'Status: Pending',
    started: 'Status: In Progress',
    blocked: 'Status: Blocked',
    completed: 'Status: Completed',
    cancelled: 'Status: Cancelled'
};

const STATUS_ALIASES = {
    'waiting': 'blocked',
    'on hold': 'blocked',
    'stuck': 'blocked',
    'done': 'completed',
    'finished': 'completed',
    'complete': 'completed',
    'ready': 'pending',
    'todo': 'pending',
    'wip': 'started',
    'in progress': 'started',
    'ongoing': 'started',
    'in dev': 'started',
    'developing': 'started',
    'testing': 'started',
    'reviewing': 'started',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'dropped': 'cancelled',
    'abandoned': 'cancelled'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'StatusParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try explicit status pattern first
        const explicitMatch = findExplicitStatus(text);
        if (explicitMatch) {
            const correction = {
                type: 'status_improvement',
                original: explicitMatch.match,
                correction: formatExplicitStatus(explicitMatch),
                position: {
                    start: text.indexOf(explicitMatch.match),
                    end: text.indexOf(explicitMatch.match) + explicitMatch.match.length
                },
                confidence: explicitMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try progress pattern
        const progressMatch = findProgressStatus(text);
        if (progressMatch) {
            const correction = {
                type: 'status_progress_improvement',
                original: progressMatch.match,
                correction: formatProgressStatus(progressMatch),
                position: {
                    start: text.indexOf(progressMatch.match),
                    end: text.indexOf(progressMatch.match) + progressMatch.match.length
                },
                confidence: progressMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try implicit status
        const implicitMatch = findImplicitStatus(text);
        if (implicitMatch) {
            const correction = {
                type: 'status_improvement',
                original: implicitMatch.match,
                correction: formatImplicitStatus(implicitMatch),
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
        logger.error('Error in status parser:', error);
        return { text, corrections: [] };
    }
}

function findExplicitStatus(text) {
    const pattern = /\b(?:is|marked\s+as|status\s*(?:is|:))?\s*([a-z][a-z\s]+)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const status = match[1].trim();
    if (!validateStatus(status)) return null;

    return {
        match: match[0],
        status,
        confidence: match[0].toLowerCase().includes('status') ? Confidence.HIGH : Confidence.MEDIUM
    };
}

function findProgressStatus(text) {
    const pattern = /\b(\d+)%\s*(?:complete|done|finished)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const progress = parseInt(match[1], 10);
    if (!validateProgress(progress)) return null;

    return {
        match: match[0],
        progress,
        confidence: Confidence.HIGH
    };
}

function findImplicitStatus(text) {
    const statusTerms = [...Object.keys(STATUS_FORMATS), ...Object.keys(STATUS_ALIASES)].join('|');
    const pattern = new RegExp(`\\b(${statusTerms})\\b`, 'i');
    const match = text.match(pattern);
    if (!match) return null;

    const status = match[1].trim();
    if (!validateStatus(status)) return null;

    return {
        match: match[0],
        status,
        confidence: Confidence.MEDIUM
    };
}

function formatExplicitStatus({ status }) {
    const normalized = normalizeStatus(status);
    return STATUS_FORMATS[normalized];
}

function formatProgressStatus({ progress }) {
    return `Status: ${progress}% Complete`;
}

function formatImplicitStatus({ status }) {
    const normalized = normalizeStatus(status);
    return STATUS_FORMATS[normalized];
}

function normalizeStatus(status) {
    return STATUS_ALIASES[status.toLowerCase()] || status.toLowerCase();
}

function validateStatus(status) {
    const normalized = normalizeStatus(status);
    return normalized in STATUS_FORMATS;
}

function validateProgress(progress) {
    return progress >= 0 && progress <= 100;
}
