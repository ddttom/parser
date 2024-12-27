import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('TimeBlockParser');

export const name = 'timeblock';

const BLOCK_TYPES = {
    deep: ['deep work', 'deep focus', 'focused work'],
    meeting: ['meeting', 'call', 'conference'],
    break: ['break', 'rest', 'lunch'],
    admin: ['admin', 'email', 'planning']
};

function inferBlockType(text) {
    const lowerText = text.toLowerCase();
    for (const [type, keywords] of Object.entries(BLOCK_TYPES)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return type;
        }
    }
    return 'general';
}

function validateTimeFormat(hours, minutes) {
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

function parseTimeComponent(timeStr) {
    // Handle 12-hour format with AM/PM
    const twelveHourMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (twelveHourMatch) {
        let hours = parseInt(twelveHourMatch[1], 10);
        const minutes = parseInt(twelveHourMatch[2] || '0', 10);
        const meridian = twelveHourMatch[3].toLowerCase();

        if (hours < 1 || hours > 12) return null;
        if (meridian === 'pm' && hours < 12) hours += 12;
        if (meridian === 'am' && hours === 12) hours = 0;

        return validateTimeFormat(hours, minutes) ? { hours, minutes } : null;
    }

    // Handle 24-hour format
    const twentyFourHourMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        const hours = parseInt(twentyFourHourMatch[1], 10);
        const minutes = parseInt(twentyFourHourMatch[2], 10);
        return validateTimeFormat(hours, minutes) ? { hours, minutes } : null;
    }

    return null;
}

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    try {
        const patterns = {
            explicit: /\[timeblock:([^\]]+)\]/i,
            range: /(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:for\s+)?([^,\n]+)?/i,
            block: /(?:block|schedule)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:for\s+)?([^,\n]+)?/i,
            period: /(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s+(?:deep work|focused|meeting|break)\s+(?:block|time)/i
        };

        let bestMatch = null;
        let highestConfidence = 0;

        for (const [pattern, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                let confidence;
                let value;

                switch (pattern) {
                    case 'explicit': {
                        const [startTime, endTime, description] = match[1].split(',').map(s => s.trim());
                        const start = parseTimeComponent(startTime);
                        const end = parseTimeComponent(endTime);

                        if (!start || !end) continue;

                        confidence = 0.95;
                        value = {
                            start,
                            end,
                            type: description ? inferBlockType(description) : 'general',
                            description: description || null
                        };
                        break;
                    }

                    case 'range':
                    case 'block': {
                        const start = parseTimeComponent(match[1]);
                        const end = parseTimeComponent(match[2]);
                        const description = match[3]?.trim();

                        if (!start || !end) continue;

                        confidence = pattern === 'block' ? 0.90 : 0.85;
                        value = {
                            start,
                            end,
                            type: description ? inferBlockType(description) : 'general',
                            description: description || null
                        };
                        break;
                    }

                    case 'period': {
                        const start = parseTimeComponent(match[1]);
                        if (!start) continue;

                        // Default to 1-hour blocks for period format
                        const end = {
                            hours: (start.hours + 1) % 24,
                            minutes: start.minutes
                        };

                        confidence = 0.80;
                        value = {
                            start,
                            end,
                            type: inferBlockType(match[0]),
                            description: null
                        };
                        break;
                    }
                }

                // Position-based confidence adjustment
                if (match.index === 0) {
                    confidence = Math.min(confidence + 0.05, 1.0);
                }

                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    bestMatch = {
                        type: 'timeblock',
                        value,
                        metadata: {
                            confidence,
                            pattern,
                            originalMatch: match[0]
                        }
                    };
                }
            }
        }

        return bestMatch;
    } catch (error) {
        logger.error('Error in timeblock parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}