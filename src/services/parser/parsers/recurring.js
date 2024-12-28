import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('RecurringParser');

// Order matters for pattern priority
const RECURRING_PATTERNS = new Map([
    ['business', /\b(?:every|each)\s+(?:business|work(?:ing)?)\s+day\b/i],
    ['weekday', /\b(?:every|each)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i],
    ['hourly', /\b(?:every|each)\s+(?:hour|hourly)\b/i],
    ['daily', /\b(?:every|each)\s+(?:day|daily)\b/i],
    ['weekly', /\b(?:every|each)\s+(?:week|weekly)\b/i],
    ['monthly', /\b(?:every|each)\s+(?:month|monthly)\b/i],
    ['interval', /\b(?:every|each)\s+(-?\d+(?:\.\d+)?)\s+(day|week|month|hour)s?\b/i],
    ['endCount', /\bfor\s+(\d+)\s+times\b/i],
    ['endDate', /\buntil\s+([^,\n]+)\b/i]
]);

const WEEKDAYS = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 0
};

export const name = 'recurring';

export async function parse(text) {
    const validationError = validateParserInput(text, 'RecurringParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check patterns in priority order
        for (const [type, pattern] of RECURRING_PATTERNS) {
            if (type === 'endCount' || type === 'endDate') continue;

            const matches = text.match(pattern);
            if (matches) {
                const value = await extractRecurringValue(matches, type);
                if (value) {
                    const endCondition = await extractEndCondition(text);
                    const confidence = calculateConfidence(type);

                    return {
                        recurring: {
                            ...value,
                            end: endCondition,
                            pattern: type,
                            confidence,
                            originalMatch: matches[0],
                            includesEndCondition: !!endCondition
                        }
                    };
                }
            }
        }

        return null;
    } catch (error) {
        logger.error('Error in recurring parser:', error);
        return {
            recurring: {
                error: 'PARSER_ERROR',
                message: error.message
            }
        };
    }
}

async function extractRecurringValue(matches, type) {
    switch (type) {
        case 'daily':
            return { type: 'day', interval: 1 };

        case 'weekly':
            return { type: 'week', interval: 1 };

        case 'monthly':
            return { type: 'month', interval: 1 };

        case 'weekday': {
            const day = matches[1].toLowerCase();
            return {
                type: 'specific',
                day,
                dayIndex: WEEKDAYS[day],
                interval: 1
            };
        }

        case 'business':
            return {
                type: 'business',
                interval: 1,
                excludeWeekends: true
            };

        case 'hourly':
            return { type: 'hour', interval: 1 };

        case 'interval': {
            const interval = parseFloat(matches[1]);
            if (interval <= 0 || !Number.isInteger(interval)) {
                throw new Error('Invalid interval value');
            }
            const unit = matches[2].toLowerCase();
            return { type: unit, interval };
        }

        default:
            return null;
    }
}

async function extractEndCondition(text) {
    // Get patterns from Map
    const endCountPattern = RECURRING_PATTERNS.get('endCount');
    const endDatePattern = RECURRING_PATTERNS.get('endDate');

    // Check for count first (higher priority)
    const countMatch = text.match(endCountPattern);
    if (countMatch) {
        const count = parseInt(countMatch[1], 10);
        if (!isNaN(count) && count > 0) {
            return { type: 'count', value: count };
        }
    }

    // Then check for date
    const dateMatch = text.match(endDatePattern);
    if (dateMatch) {
        const dateValue = dateMatch[1].trim();
        if (dateValue) {
            return { type: 'until', value: dateValue };
        }
    }

    return null;
}

function calculateConfidence(type) {
    // Return confidence level based on pattern type
    switch (type) {
        case 'weekday':
        case 'business':
            return Confidence.HIGH;
        case 'daily':
        case 'weekly':
        case 'monthly':
        case 'hourly':
            return Confidence.MEDIUM;
        default:
            return Confidence.LOW;
    }
}
