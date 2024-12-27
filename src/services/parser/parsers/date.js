import { createLogger } from '../../../utils/logger.js';
import { validatePatternMatch, calculateBaseConfidence } from '../utils/patterns.js';

const logger = createLogger('DateParser');

const DATE_PATTERNS = {
    deadline: /\b(?:due|deadline):\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{4}-\d{2}-\d{2}|today|tomorrow|yesterday)\b/i,
    scheduled: /\b(?:scheduled|planned):\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{4}-\d{2}-\d{2}|today|tomorrow|yesterday)\b/i,
    iso: /\b(\d{4}-\d{2}-\d{2})\b/,
    natural: /\b(?:on\s+)?(?:the\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
    relative: /\b(today|tomorrow|yesterday)\b/i,
    next_weekday: /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
    in_period: /\bin\s+(\d+)\s+(day|week|month|year)s?\b/i,
    next_period: /\bnext\s+(week|month|year)\b/i
};

const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const name = 'date';

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    try {
        let matches = [];

        // Collect all matches with their positions
        for (const format of ['deadline', 'scheduled']) {
            const regex = new RegExp(DATE_PATTERNS[format], 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push({ format, match, index: match.index });
            }
        }

        for (const [format, pattern] of Object.entries(DATE_PATTERNS)) {
            if (format === 'deadline' || format === 'scheduled') continue;
            const regex = new RegExp(pattern, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push({ format, match, index: match.index });
            }
        }

        // Sort matches by position and confidence
        matches.sort((a, b) => {
            const aConfidence = calculateConfidence(a.match, text, a.format);
            const bConfidence = calculateConfidence(b.match, text, b.format);
            // If confidence is similar (within 0.05), use position
            if (Math.abs(aConfidence - bConfidence) <= 0.05) {
                return a.index - b.index;
            }
            // Otherwise, use confidence
            return bConfidence - aConfidence;
        });

        // Try each match in order
        for (const { format, match } of matches) {
            // Extract the date text based on format
            let dateText;
            if (format === 'natural') {
                const month = match[1];
                const day = match[2];
                const year = match[3];
                dateText = `${month} ${day} ${year}`;
            } else {
                dateText = match[1]?.trim() || match[0];
            }
            const result = await extractDateValue(dateText, format, match);
            if (result) {
                return {
                    type: 'date',
                    value: result.value,
                    metadata: {
                        pattern: format,
                        confidence: result.confidence,
                        originalMatch: match[0],
                        format: result.format || format
                    }
                };
            }
        }

        return null;
    } catch (error) {
        logger.error('Error in date parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}

async function extractDateValue(text, format = null, matches = null) {
    try {
        let date = null;
        let confidence = calculateConfidence(matches, text, format);

        // If we have matches and a format, use them directly
        if (matches && format) {
            switch (format) {
                case 'deadline':
                case 'scheduled': {
                    // Check if it's an ISO date
                    if (matches[1].match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [year, month, day] = matches[1].split('-').map(Number);
                        if (isValidDateComponents(year, month, day)) {
                            date = new Date(year, month - 1, day);
                        }
                    } else {
                        // Try to parse as natural date
                        const naturalMatch = matches[1].match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
                        if (naturalMatch) {
                            const month = MONTHS[naturalMatch[1].toLowerCase().slice(0, 3)] + 1;
                            const day = parseInt(naturalMatch[2], 10);
                            const year = parseInt(naturalMatch[3], 10);
                            if (isValidDateComponents(year, month, day)) {
                                date = new Date(year, month - 1, day);
                            }
                        }
                    }
                    break;
                }

                case 'iso': {
                    const [year, month, day] = matches[1].split('-').map(Number);
                    if (isValidDateComponents(year, month, day)) {
                        date = new Date(year, month - 1, day);
                    }
                    break;
                }

                case 'natural': {
                    const month = MONTHS[matches[1].toLowerCase().slice(0, 3)] + 1;
                    const day = parseInt(matches[2], 10);
                    const year = parseInt(matches[3], 10);
                    if (isValidDateComponents(year, month, day)) {
                        date = new Date(year, month - 1, day);
                    }
                    break;
                }

                case 'relative': {
                    date = new Date();
                    const relativeText = matches[1].toLowerCase();
                    if (relativeText === 'tomorrow') {
                        date.setDate(date.getDate() + 1);
                    } else if (relativeText === 'yesterday') {
                        date.setDate(date.getDate() - 1);
                    }
                    format = 'relative';
                    break;
                }

                case 'next_weekday': {
                    date = new Date();
                    const weekday = matches[1].toLowerCase().split(' ')[1];
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
                    format = 'relative';
                    confidence = 0.75;
                    break;
                }

                case 'in_period': {
                    const amount = parseInt(matches[1], 10);
                    const unit = matches[2].toLowerCase();
                    
                    // Validate amount
                    if (amount <= 0 || amount > 100) {
                        return null;
                    }

                    date = new Date();
                    switch (unit) {
                        case 'day':
                            date.setDate(date.getDate() + amount);
                            break;
                        case 'week':
                            date.setDate(date.getDate() + amount * 7);
                            break;
                        case 'month': {
                            const originalDay = date.getDate();
                            date.setMonth(date.getMonth() + amount);
                            // Handle month boundary transitions
                            if (date.getDate() !== originalDay) {
                                date.setDate(0); // Go to last day of previous month
                            }
                            break;
                        }
                        case 'year': {
                            const originalMonth = date.getMonth();
                            const originalDay = date.getDate();
                            date.setFullYear(date.getFullYear() + amount);
                            // Handle leap year transitions
                            if (date.getMonth() !== originalMonth) {
                                date.setDate(0); // Go to last day of previous month
                            }
                            break;
                        }
                    }
                    format = 'in_period';
                    confidence = 0.75;
                    break;
                }

                case 'next_period': {
                    date = new Date();
                    const unit = matches[1].toLowerCase();
                    switch (unit) {
                        case 'week':
                            date.setDate(date.getDate() + 7);
                            break;
                        case 'month': {
                            const originalDay = date.getDate();
                            date.setMonth(date.getMonth() + 1);
                            // Handle month boundary transitions
                            if (date.getDate() !== originalDay) {
                                date.setDate(0); // Go to last day of previous month
                            }
                            break;
                        }
                        case 'year': {
                            const originalMonth = date.getMonth();
                            const originalDay = date.getDate();
                            date.setFullYear(date.getFullYear() + 1);
                            // Handle leap year transitions
                            if (date.getMonth() !== originalMonth) {
                                date.setDate(0); // Go to last day of previous month
                            }
                            break;
                        }
                    }
                    format = 'next_period';
                    confidence = 0.75;
                    break;
                }
            }
        }

        if (!date || !isValidDate(date)) {
            return null;
        }

        return {
            value: validateAndFormatDate(date),
            format,
            confidence
        };
    } catch (error) {
        logger.warn('Date extraction failed:', { text, format, error });
        return null;
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

function calculateConfidence(matches, text, type) {
    let confidence = 0.7;

    // Pattern-based confidence
    switch (type) {
        case 'iso': confidence = 0.9; break;
        case 'deadline':
        case 'scheduled': confidence = 0.95; break;
        case 'natural': {
            confidence = 0.75;
            // Boost confidence for natural dates at start of text or after "Start"/"Begin"
            const prefix = text.slice(0, matches.index).trim().toLowerCase();
            if (matches.index === 0 || prefix === '' || prefix.endsWith('start') || prefix.endsWith('begin')) {
                confidence = 0.9;
            }
            break;
        }
        case 'relative': {
            const term = matches[1].toLowerCase();
            confidence = term === 'tomorrow' ? 0.95 : 0.85;
            break;
        }
        case 'next_weekday': confidence = 0.85; break;
        case 'in_period': confidence = 0.77; break;
        case 'next_period': confidence = 0.77; break;
    }

    // Position-based confidence
    if (matches.index === 0) confidence += 0.02;
    if (matches.index > 0 && text[matches.index - 1] === ' ') confidence += 0.02;

    // Context-based confidence
    const prefix = text.slice(0, matches.index).trim().toLowerCase();
    const contextWords = ['start', 'begin', 'from', 'on'];
    for (const word of contextWords) {
        if (prefix.endsWith(word)) {
            confidence += 0.05;
            break;
        }
    }

    return Math.min(confidence, 1.0);
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
