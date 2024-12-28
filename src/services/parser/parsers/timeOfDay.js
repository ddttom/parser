import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TimeOfDayParser');

export const name = 'timeofday';

const NATURAL_PERIODS = {
    morning: { start: 6, end: 11 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 18, end: 21 },
    night: { start: 22, end: 5 }
};

function validateTime(hour, minute) {
    if (typeof hour !== 'number' || typeof minute !== 'number') return false;
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function convertTo24Hour(hour, period) {
    if (period === 'PM' && hour < 12) return hour + 12;
    if (period === 'AM' && hour === 12) return 0;
    return hour;
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'TimeOfDayParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for explicit time format
        const explicitMatch = text.match(/\[time:(\d{1,2}):(\d{2})\]/i);
        if (explicitMatch) {
            const hour = parseInt(explicitMatch[1], 10);
            const minute = parseInt(explicitMatch[2], 10);
            if (!validateTime(hour, minute)) return null;

            return {
                type: 'timeofday',
                value: {
                    hour,
                    minute,
                    format: '24h'
                },
                metadata: {
                    pattern: 'explicit_time',
                    confidence: Confidence.HIGH,
                    originalMatch: explicitMatch[0]
                }
            };
        }

        // Check for 12-hour format
        const twelveHourMatch = text.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
        if (twelveHourMatch) {
            const rawHour = parseInt(twelveHourMatch[1], 10);
            const minute = parseInt(twelveHourMatch[2], 10);
            const period = twelveHourMatch[3].toUpperCase();
            
            if (rawHour < 1 || rawHour > 12) return null;
            if (!validateTime(rawHour, minute)) return null;
            if (period !== 'AM' && period !== 'PM') return null;

            const hour = convertTo24Hour(rawHour, period);

            return {
                type: 'timeofday',
                value: {
                    hour,
                    minute,
                    format: '12h',
                    period
                },
                metadata: {
                    pattern: '12h_time',
                    confidence: Confidence.HIGH,
                    originalMatch: twelveHourMatch[0]
                }
            };
        }

        // Check for natural time expressions
        const naturalMatch = text.match(/\b(?:in\s+the\s+)?(morning|afternoon|evening|night)\b/i);
        if (naturalMatch) {
            const period = naturalMatch[1].toLowerCase();
            if (period in NATURAL_PERIODS) {
                return {
                    type: 'timeofday',
                    value: {
                        period,
                        approximate: true
                    },
                    metadata: {
                        pattern: 'natural_time',
                        confidence: Confidence.MEDIUM,
                        originalMatch: naturalMatch[1]
                    }
                };
            }
        }

        return null;
    } catch (error) {
        logger.error('Error in timeofday parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
