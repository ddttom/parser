import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('RemindersParser');

const TIME_WORDS = {
    tomorrow: { unit: 'day', amount: 1 },
    'next week': { unit: 'week', amount: 1 },
    'next month': { unit: 'month', amount: 1 }
};

const REMINDER_PATTERNS = {
    explicit: /\b(?:remind(?:er)?\s*(?:me|us)?\s*in)\s*(\d+)\s*(minute|hour|day|week)s?\b/i,
    before: /\b(\d+)\s*(minute|hour|day|week)s?\s*before\b/i,
    at: /\bremind(?:er)?\s*(?:me|us)?\s*at\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
    on: /\bremind(?:er)?\s*(?:me|us)?\s*on\s*([^,\n]+)\b/i,
    relative: /\bin\s*(\d+)\s*(minute|hour|day|week)s?\b/i,
    timeword: /\bremind(?:er)?\s*(?:me|us)?\s*(tomorrow|next\s+(?:week|month))\b/i
};

const MINUTES_IN = {
    minute: 1,
    hour: 60,
    day: 1440,
    week: 10080
};

export const name = 'reminders';

export async function parse(text) {
    const validationError = validateParserInput(text, 'RemindersParser');
    if (validationError) {
        return validationError;
    }

    try {
        for (const [type, pattern] of Object.entries(REMINDER_PATTERNS)) {
            const matches = text.match(pattern);
            if (matches) {
                const value = await extractReminderValue(matches, type);
                if (value) {
                    const confidence = calculateConfidence(type);
                    return {
                        type: 'reminder',
                        value,
                        metadata: {
                            pattern: type,
                            confidence,
                            originalMatch: matches[0],
                            isRelative: type === 'relative' || type === 'explicit'
                        }
                    };
                }
            }
        }

        return null;
    } catch (error) {
        logger.error('Error in reminders parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}

async function extractReminderValue(matches, type) {
    try {
        switch (type) {
            case 'explicit':
            case 'relative': {
                const amount = parseInt(matches[1], 10);
                const unit = matches[2].toLowerCase();
                if (amount <= 0) throw new Error('Invalid time amount');
                return {
                    type: 'offset',
                    minutes: amount * MINUTES_IN[unit]
                };
            }

            case 'timeword': {
                const word = matches[1].toLowerCase();
                const timeWord = TIME_WORDS[word];
                if (!timeWord) return null;
                return {
                    type: 'offset',
                    minutes: timeWord.amount * MINUTES_IN[timeWord.unit]
                };
            }

            case 'before': {
                const amount = parseInt(matches[1], 10);
                const unit = matches[2].toLowerCase();
                if (amount <= 0) throw new Error('Invalid time amount');
                return {
                    type: 'before',
                    minutes: amount * MINUTES_IN[unit]
                };
            }

            case 'at': {
                const hours = parseInt(matches[1], 10);
                const minutes = parseInt(matches[2] || '0', 10);
                const meridian = matches[3]?.toLowerCase();
                
                let hour = hours;
                if (meridian === 'pm' && hour < 12) hour += 12;
                if (meridian === 'am' && hour === 12) hour = 0;

                if (hour < 0 || hour > 23 || minutes < 0 || minutes > 59) {
                    throw new Error('Invalid time values');
                }

                return {
                    type: 'time',
                    hour,
                    minutes
                };
            }

            case 'on': {
                return {
                    type: 'date',
                    value: matches[1].trim()
                };
            }

            default:
                return null;
        }
    } catch (error) {
        logger.warn('Reminder extraction failed:', { matches, type, error });
        return null;
    }
}

function calculateConfidence(type) {
    switch (type) {
        case 'explicit':
            return Confidence.HIGH;
        case 'at':
        case 'before':
            return Confidence.HIGH;
        case 'on':
        case 'relative':
            return Confidence.MEDIUM;
        default:
            return Confidence.LOW;
    }
}
