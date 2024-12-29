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

async function extractReminderValue(matches, type) {
    try {
        switch (type) {
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

function formatReminder(reminder) {
    switch (reminder.type) {
        case 'offset':
            if (reminder.pattern === 'relative') {
                const unit = Object.entries(MINUTES_IN).find(([_, mins]) => reminder.minutes % mins === 0)?.[0] || 'minute';
                const amount = Math.floor(reminder.minutes / MINUTES_IN[unit]);
                return `in ${amount} ${unit}${amount !== 1 ? 's' : ''}`;
            } else if (reminder.pattern === 'timeword') {
                return reminder.originalMatch;
            } else {
                const unit = Object.entries(MINUTES_IN).find(([_, mins]) => reminder.minutes % mins === 0)?.[0] || 'minute';
                const amount = Math.floor(reminder.minutes / MINUTES_IN[unit]);
                return `${amount} ${unit}${amount !== 1 ? 's' : ''} before`;
            }
        case 'time': {
            const hour = reminder.hour % 12 || 12;
            const meridian = reminder.hour < 12 ? 'am' : 'pm';
            const minutes = reminder.minutes.toString().padStart(2, '0');
            return `remind me at ${hour}:${minutes}${meridian}`;
        }
        case 'date':
            return `remind me on ${reminder.value}`;
        default:
            return reminder.originalMatch;
    }
}

export async function perfect(text) {
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
                    const reminderInfo = {
                        ...value,
                        pattern: type,
                        confidence,
                        originalMatch: matches[0],
                        isRelative: type === 'relative'
                    };

                    const correction = {
                        type: 'reminder',
                        original: matches[0],
                        correction: formatReminder(reminderInfo),
                        position: {
                            start: text.indexOf(matches[0]),
                            end: text.indexOf(matches[0]) + matches[0].length
                        },
                        confidence: confidence === Confidence.HIGH ? 'HIGH' : 
                                   confidence === Confidence.MEDIUM ? 'MEDIUM' : 'LOW'
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
        logger.error('Error in reminders parser:', error);
        throw error;
    }
}
