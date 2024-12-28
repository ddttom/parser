import { createLogger } from '../../../utils/logger.js';
import { validateParserInput } from '../utils/validation.js';
import { Confidence } from '../utils/confidence.js';

const logger = createLogger('DateParser');

const DATE_PATTERNS = {
    natural_date: /\b(?:on\s+)?(?:the\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
    relative_date: /\b(today|tomorrow|yesterday)\b/i,
    weekday_reference: /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
    in_period: /\bin\s+(\d+)\s+(day|week|month|year)s?\b/i,
    next_period: /\bnext\s+(week|month|year)\b/i,
    implicit_date: /\bsometime\s+next\s+week\b/i
};

const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const name = 'date';

export async function perfect(text) {
    const validationError = validateParserInput(text, 'DateParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        let bestMatch = null;
        let highestConfidence = Confidence.LOW;

        for (const [pattern, regex] of Object.entries(DATE_PATTERNS)) {
            const match = text.match(regex);
            if (match) {
                const result = await extractDateValue(match[0], pattern, match);
                if (!result) continue;

                const shouldUpdate = !bestMatch || 
                    (result.confidence === Confidence.HIGH && bestMatch.confidence !== Confidence.HIGH) ||
                    (result.confidence === Confidence.MEDIUM && bestMatch.confidence === Confidence.LOW);
                
                if (shouldUpdate) {
                    const improvedText = formatDateText(result.value, pattern);
                    bestMatch = {
                        originalText: match[0],
                        improvedText,
                        value: result.value,
                        confidence: result.confidence,
                        position: {
                            start: match.index,
                            end: match.index + match[0].length
                        }
                    };
                    highestConfidence = result.confidence;
                }
            }
        }

        // If no match found, return original text
        if (!bestMatch) {
            return { text, corrections: [] };
        }

        // Create correction record
        const correction = {
            type: 'date_standardization',
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
        logger.error('Error in date parser:', error);
        return { text, corrections: [] };
    }
}

async function extractDateValue(text, format, match) {
    try {
        let date = null;
        let confidence = calculateConfidence(format);

        switch (format) {
            case 'natural_date': {
                const month = MONTHS[match[1].toLowerCase().slice(0, 3)] + 1;
                const day = parseInt(match[2], 10);
                const year = parseInt(match[3], 10);
                if (isValidDateComponents(year, month, day)) {
                    date = new Date(year, month - 1, day);
                }
                break;
            }

            case 'relative_date': {
                date = new Date();
                const relativeText = text.toLowerCase();
                if (relativeText === 'tomorrow') {
                    date.setDate(date.getDate() + 1);
                } else if (relativeText === 'yesterday') {
                    date.setDate(date.getDate() - 1);
                }
                break;
            }

            case 'weekday_reference': {
                date = new Date();
                const weekday = text.toLowerCase().split(' ')[1];
                const targetDay = WEEKDAYS.map(d => d.toLowerCase()).indexOf(weekday);
                if (targetDay !== -1) {
                    date.setDate(date.getDate() + 7);
                    while (date.getDay() !== targetDay) {
                        date.setDate(date.getDate() + 1);
                    }
                }
                break;
            }

            case 'implicit_date': {
                date = new Date();
                date.setDate(date.getDate() + 7);
                break;
            }
        }

        if (!date || !isValidDate(date)) {
            return null;
        }

        return {
            value: date,
            confidence
        };
    } catch (error) {
        logger.warn('Date extraction failed:', { text, format, error });
        return null;
    }
}

function formatDateText(date, format) {
    const month = MONTH_NAMES[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const weekday = WEEKDAYS[date.getDay()];

    switch (format) {
        case 'natural_date':
            return `${month} ${day}, ${year}`;
        case 'relative_date':
        case 'weekday_reference':
        case 'implicit_date':
            return `${weekday}, ${month} ${day}, ${year}`;
        default:
            return `${month} ${day}, ${year}`;
    }
}

function calculateConfidence(format) {
    switch (format) {
        case 'natural_date':
            return Confidence.HIGH;
        case 'relative_date':
        case 'weekday_reference':
            return Confidence.MEDIUM;
        case 'implicit_date':
            return Confidence.LOW;
        default:
            return Confidence.MEDIUM;
    }
}

function isValidDateComponents(year, month, day) {
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
        return false;
    }

    const maxDays = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
    return day <= maxDays;
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function isValidDate(date) {
    if (!date || date.toString() === 'Invalid Date') {
        return false;
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    
    return isValidDateComponents(year, month, day);
}
