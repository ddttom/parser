import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TimeBlockParser');

export const name = 'timeblock';

const BLOCK_TYPES = {
    deep: ['deep work', 'deep focus', 'focused work', 'focused time'],
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

function formatTimeBlock(timeblock) {
    const formatTime = (time) => {
        const hours = time.hours % 12 || 12;
        const minutes = time.minutes.toString().padStart(2, '0');
        const meridian = time.hours < 12 ? 'am' : 'pm';
        return `${hours}:${minutes}${meridian}`;
    };

    const start = formatTime(timeblock.start);
    const end = formatTime(timeblock.end);
    const type = timeblock.type !== 'general' ? ` for ${timeblock.type}` : '';
    const description = timeblock.description ? ` (${timeblock.description})` : '';

    return `${start} to ${end}${type}${description}`;
}

export async function perfect(text) {
    const validationError = validateParserInput(text, 'TimeBlockParser');
    if (validationError) {
        return validationError;
    }

    try {
        const patterns = {
            range: /(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:for\s+)?([^,\n]+)?/i,
            block: /^(?:block|schedule)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*(?:for\s+)?([^,\n]+)?/i,
            period: /^(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s+(?:deep work|focused|meeting|break)\s+(?:block|time)$/i
        };

        for (const [patternName, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                let matchData = null;

                switch (patternName) {
                    case 'range': {
                        const start = parseTimeComponent(match[1]);
                        const end = parseTimeComponent(match[2]);
                        const description = match[3]?.trim();

                        if (!start || !end) continue;

                        matchData = {
                            start,
                            end,
                            type: description ? inferBlockType(description) : 'general',
                            description: description || null,
                            confidence: Confidence.MEDIUM,
                            pattern: patternName,
                            originalText: match[0]
                        };
                        break;
                    }

                    case 'block': {
                        const start = parseTimeComponent(match[1]);
                        const end = parseTimeComponent(match[2]);
                        const description = match[3]?.trim();

                        if (!start || !end) continue;

                        matchData = {
                            start,
                            end,
                            type: description ? inferBlockType(description) : 'general',
                            description: description || null,
                            confidence: Confidence.HIGH,
                            pattern: patternName,
                            originalText: match[0]
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

                        matchData = {
                            start,
                            end,
                            type: inferBlockType(match[0]),
                            description: null,
                            confidence: Confidence.MEDIUM,
                            pattern: patternName,
                            originalText: match[0]
                        };
                        break;
                    }
                }

                if (matchData) {
                    const correction = {
                        type: 'timeblock',
                        original: matchData.originalText,
                        correction: formatTimeBlock(matchData),
                        position: {
                            start: text.indexOf(matchData.originalText),
                            end: text.indexOf(matchData.originalText) + matchData.originalText.length
                        },
                        confidence: matchData.confidence === Confidence.HIGH ? 'HIGH' : 
                                   matchData.confidence === Confidence.MEDIUM ? 'MEDIUM' : 'LOW'
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
        }

        return {
            text,
            corrections: []
        };
    } catch (error) {
        logger.error('Error in timeblock parser:', error);
        throw error;
    }
}
