import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TimeParser');

const TIME_PATTERNS = {
    specific: /\b(?:(?:at|by)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(?:(?:at|by)\s+)?(\d{1,2})\s*(?::\d{2})?\s*(?:am|pm)\b/i,
    twentyFourHour: /\b(\d{1,2}):(\d{2})\b/,
    period: /\b(?:in\s+the\s+)?(morning|afternoon|evening)\b/i,
    action: /\b(meet|call|text)\b/i
};

const TIME_OF_DAY = {
    morning: { start: 9, end: 12 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 17, end: 21 }
};

export const name = 'time';

export async function parse(text) {
    const validationError = validateParserInput(text, 'TimeParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for period words first
        const periodMatch = text.match(TIME_PATTERNS.period);
        if (periodMatch) {
            const period = periodMatch[1].toLowerCase();
            const config = TIME_OF_DAY[period];
            if (config) {
                return {
                    type: 'time',
                    value: {
                        period,
                        start: config.start,
                        end: config.end
                    },
                    metadata: {
                        pattern: 'period',
                        confidence: calculateConfidence(periodMatch, text, 'period'),
                        originalMatch: periodMatch[0]
                    }
                };
            }
        }

        // Try 24-hour format first
        const twentyFourMatch = text.match(TIME_PATTERNS.twentyFourHour);
        if (twentyFourMatch) {
            const hours = parseInt(twentyFourMatch[1], 10);
            const minutes = parseInt(twentyFourMatch[2], 10);
            
            // Validate hours and minutes
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                return {
                    type: 'error',
                    error: 'PARSER_ERROR',
                    message: 'Invalid time values'
                };
            }

            return {
                type: 'time',
                value: {
                    hours,
                    minutes
                },
                metadata: {
                    pattern: '24hour',
                    confidence: Confidence.HIGH,
                    originalMatch: twentyFourMatch[0]
                }
            };
        }

        // Try 12-hour format
        const timeMatch = text.match(TIME_PATTERNS.specific);
        if (timeMatch) {
            // Only parse if AM/PM is present
            if (!timeMatch[3]) {
                return null;
            }
            const timeValue = parseTimeComponents(
                timeMatch[1] || timeMatch[4], // Either group 1 or 4 will have the hours
                timeMatch[2], // Minutes (optional)
                timeMatch[3] // AM/PM
            );
            if (!timeValue) {
                return {
                    type: 'error',
                    error: 'PARSER_ERROR',
                    message: 'Invalid time values'
                };
            }

            // Remove prefix from originalMatch
            const originalMatch = timeMatch[0].replace(/^(?:at|by)\s+/i, '');

            return {
                type: 'time',
                value: timeValue,
                metadata: {
                    pattern: 'specific',
                    confidence: calculateConfidence(timeMatch, text, 'specific'),
                    originalMatch
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in time parser:', {
            error: error.message,
            stack: error.stack,
            input: text
        });
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}

function formatTimeString(timeValue) {
    if (!timeValue) return null;
    const { hours, minutes } = timeValue;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

function parseTimeComponents(hours, minutes, meridian) {
    try {
        let parsedHours = parseInt(hours, 10);
        const parsedMinutes = parseInt(minutes || '0', 10);

        // Basic validation
        if (isNaN(parsedHours) || isNaN(parsedMinutes)) {
            return null;
        }

        // Handle 12-hour format
        if (meridian) {
            // 12-hour format with AM/PM
            if (parsedHours < 1 || parsedHours > 12) {
                return null;
            }
            if (meridian.toLowerCase() === 'pm' && parsedHours < 12) {
                parsedHours += 12;
            } else if (meridian.toLowerCase() === 'am' && parsedHours === 12) {
                parsedHours = 0;
            }
        } else {
            // 24-hour format
            if (parsedHours < 0 || parsedHours > 23) {
                return null;
            }
        }

        // Minutes validation
        if (parsedMinutes < 0 || parsedMinutes > 59) {
            return null;
        }

        return {
            hours: parsedHours,
            minutes: parsedMinutes
        };
    } catch (error) {
        logger.warn('Time parsing failed:', { hours, minutes, meridian, error });
        return null;
    }
}

function calculateConfidence(matches, text, type) {
    // Pattern-based confidence
    switch (type) {
        case 'specific':
            return matches[2] || matches[3] ? Confidence.HIGH : Confidence.MEDIUM;
        case 'period':
            return matches[0].includes('in the') ? Confidence.MEDIUM : Confidence.LOW;
        case 'action':
            return Confidence.LOW;
        default:
            return Confidence.LOW;
    }
}
