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
    morning: { start: 9, end: 12, display: 'morning (09:00-12:00)' },
    afternoon: { start: 12, end: 17, display: 'afternoon (12:00-17:00)' },
    evening: { start: 17, end: 21, display: 'evening (17:00-21:00)' }
};

export const name = 'time';

export async function perfect(text) {
    const validationError = validateParserInput(text, 'TimeParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        let bestMatch = null;
        let highestConfidence = Confidence.LOW;

        // Check for period words first
        const periodMatch = text.match(TIME_PATTERNS.period);
        if (periodMatch) {
            const period = periodMatch[1].toLowerCase();
            const config = TIME_OF_DAY[period];
            if (config) {
                const improvedText = `in the ${config.display}`;
                bestMatch = {
                    originalText: periodMatch[0],
                    improvedText,
                    confidence: calculateConfidence(periodMatch, text, 'period'),
                    position: {
                        start: periodMatch.index,
                        end: periodMatch.index + periodMatch[0].length
                    }
                };
            }
        }

        // Try 24-hour format
        const twentyFourMatch = text.match(TIME_PATTERNS.twentyFourHour);
        if (twentyFourMatch) {
            const hours = parseInt(twentyFourMatch[1], 10);
            const minutes = parseInt(twentyFourMatch[2], 10);
            
            if (isValidTime(hours, minutes)) {
                const improvedText = formatTime(hours, minutes);
                const confidence = Confidence.HIGH;

                if (!bestMatch || confidence > bestMatch.confidence) {
                    bestMatch = {
                        originalText: twentyFourMatch[0],
                        improvedText,
                        confidence,
                        position: {
                            start: twentyFourMatch.index,
                            end: twentyFourMatch.index + twentyFourMatch[0].length
                        }
                    };
                }
            }
        }

        // Try 12-hour format
        const timeMatch = text.match(TIME_PATTERNS.specific);
        if (timeMatch) {
            const timeValue = parseTimeComponents(
                timeMatch[1] || timeMatch[4],
                timeMatch[2],
                timeMatch[3]
            );

            if (timeValue) {
                const improvedText = formatTime(timeValue.hours, timeValue.minutes);
                const confidence = calculateConfidence(timeMatch, text, 'specific');

                if (!bestMatch || confidence > bestMatch.confidence) {
                    // Remove prefix from originalMatch
                    const originalText = timeMatch[0].replace(/^(?:at|by)\s+/i, '');
                    bestMatch = {
                        originalText,
                        improvedText,
                        confidence,
                        position: {
                            start: timeMatch.index,
                            end: timeMatch.index + timeMatch[0].length
                        }
                    };
                }
            }
        }

        // If no match found, return original text
        if (!bestMatch) {
            return { text, corrections: [] };
        }

        // Create correction record
        const correction = {
            type: 'time_standardization',
            original: bestMatch.originalText,
            correction: bestMatch.improvedText,
            position: bestMatch.position,
            confidence: bestMatch.confidence
        };

        // Apply the correction to the text
        const before = text.substring(0, bestMatch.position.start);
        const after = text.substring(bestMatch.position.end);
        const perfectedText = before + bestMatch.improvedText + after;

        return {
            text: perfectedText,
            corrections: [correction]
        };

    } catch (error) {
        logger.error('Error in time parser:', error);
        return { text, corrections: [] };
    }
}

function formatTime(hours, minutes) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function parseTimeComponents(hours, minutes, meridian) {
    try {
        let parsedHours = parseInt(hours, 10);
        const parsedMinutes = parseInt(minutes || '0', 10);

        if (!isValidTime(parsedHours, parsedMinutes)) {
            return null;
        }

        // Handle 12-hour format
        if (meridian) {
            if (parsedHours < 1 || parsedHours > 12) {
                return null;
            }
            if (meridian.toLowerCase() === 'pm' && parsedHours < 12) {
                parsedHours += 12;
            } else if (meridian.toLowerCase() === 'am' && parsedHours === 12) {
                parsedHours = 0;
            }
        } else if (parsedHours < 0 || parsedHours > 23) {
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

function isValidTime(hours, minutes) {
    return !isNaN(hours) && !isNaN(minutes) &&
           hours >= 0 && hours <= 23 &&
           minutes >= 0 && minutes <= 59;
}

function calculateConfidence(matches, text, type) {
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
