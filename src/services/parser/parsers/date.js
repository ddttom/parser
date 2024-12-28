import { createLogger } from '../../../utils/logger.js';
import { validatePatternMatch, calculateBaseConfidence } from '../utils/patterns.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

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

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Map pattern names to format values
const FORMAT_MAP = {
    natural_date: 'natural',
    relative_date: 'relative',
    weekday_reference: 'weekday',
    in_period: 'relative',
    next_period: 'relative',
    implicit_date: 'relative'
};

export const name = 'date';

export async function parse(text) {
    const validationError = validateParserInput(text, 'DateParser');
    if (validationError) {
        return validationError;
    }

    try {
        let bestMatch = null;
        let highestConfidence = Confidence.LOW;

        for (const [pattern, regex] of Object.entries(DATE_PATTERNS)) {
            const match = text.match(regex);
            if (match) {
                const result = await extractDateValue(match[1] || match[0], pattern, match, text);
                // Update if current confidence is higher or equal priority pattern
                const shouldUpdate = result && (!bestMatch || 
                    (result.confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
                    (result.confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW));
                
                if (shouldUpdate) {
                    highestConfidence = result.confidence;
                    bestMatch = {
                        type: 'date',
                        value: {
                            date: result.value,
                            format: FORMAT_MAP[pattern]
                        },
                        metadata: {
                            confidence: result.confidence,
                            pattern,
                            originalMatch: match[0]
                        }
                    };
                }
            }
        }

        // Return null if no match found
        if (!bestMatch) {
            return null;
        }

        // Return standardized format with parser name as key
        return {
            date: {
                value: bestMatch.value.date,
                format: bestMatch.value.format,
                confidence: bestMatch.metadata.confidence,
                pattern: bestMatch.metadata.pattern,
                originalMatch: bestMatch.metadata.originalMatch
            }
        };
    } catch (error) {
        logger.error('Error in date parser:', error);
        return {
            date: {
                error: 'PARSER_ERROR',
                message: error.message
            }
        };
    }
}

async function extractDateValue(text, format, match, fullText) {
    try {
        let date = null;
        let confidence = calculateConfidence(format, match, fullText);

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
                const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                    .indexOf(weekday);
                if (targetDay !== -1) {
                    // First add 7 days
                    date.setDate(date.getDate() + 7);
                    // Then find next occurrence of target day
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
            value: validateAndFormatDate(date),
            confidence
        };
    } catch (error) {
        logger.warn('Date extraction failed:', { text, format, error });
        return null;
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

    // Check days in month, accounting for leap years
    const maxDays = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
    return day <= maxDays;
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function validateAndFormatDate(date) {
    if (!isValidDate(date)) {
        return null;
    }
    return date.toISOString().split('T')[0];
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
