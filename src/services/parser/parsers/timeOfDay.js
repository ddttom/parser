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

function formatTimeOfDay(timeInfo) {
    if (timeInfo.format === '12h') {
        return `${timeInfo.hour % 12 || 12}:${timeInfo.minute.toString().padStart(2, '0')} ${timeInfo.period}`;
    } else if (timeInfo.approximate) {
        const period = timeInfo.period;
        const range = NATURAL_PERIODS[period];
        return `in the ${period} (${range.start}:00-${range.end}:00)`;
    }
    return timeInfo.originalMatch;
}

export async function perfect(text) {
    const validationError = validateParserInput(text, 'TimeOfDayParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for 12-hour format
        const twelveHourMatch = text.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
        if (twelveHourMatch) {
            const rawHour = parseInt(twelveHourMatch[1], 10);
            const minute = parseInt(twelveHourMatch[2], 10);
            const period = twelveHourMatch[3].toUpperCase();
            
            if (rawHour < 1 || rawHour > 12) return { text, corrections: [] };
            if (!validateTime(rawHour, minute)) return { text, corrections: [] };
            if (period !== 'AM' && period !== 'PM') return { text, corrections: [] };

            const hour = convertTo24Hour(rawHour, period);

            const timeInfo = {
                hour,
                minute,
                format: '12h',
                period,
                pattern: '12h_time',
                confidence: Confidence.HIGH,
                originalMatch: twelveHourMatch[0]
            };

            const correction = {
                type: 'timeofday',
                original: timeInfo.originalMatch,
                correction: formatTimeOfDay(timeInfo),
                position: {
                    start: text.indexOf(timeInfo.originalMatch),
                    end: text.indexOf(timeInfo.originalMatch) + timeInfo.originalMatch.length
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

        // Check for natural time expressions
        const naturalMatch = text.match(/\b(?:in\s+the\s+)?(morning|afternoon|evening|night)\b/i);
        if (naturalMatch) {
            const period = naturalMatch[1].toLowerCase();
            if (period in NATURAL_PERIODS) {
                const timeInfo = {
                    period,
                    approximate: true,
                    pattern: 'natural_time',
                    confidence: Confidence.MEDIUM,
                    originalMatch: naturalMatch[0]
                };

                const correction = {
                    type: 'timeofday',
                    original: timeInfo.originalMatch,
                    correction: formatTimeOfDay(timeInfo),
                    position: {
                        start: text.indexOf(timeInfo.originalMatch),
                        end: text.indexOf(timeInfo.originalMatch) + timeInfo.originalMatch.length
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
        logger.error('Error in timeofday parser:', error);
        throw error;
    }
}
