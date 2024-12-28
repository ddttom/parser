import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('CostParser');

export const name = 'cost';

const CURRENCY_FORMATS = {
    USD: {
        symbol: '$',
        name: 'USD',
        format: (amount) => `$${formatAmount(amount)}`
    },
    GBP: {
        symbol: '£',
        name: 'GBP',
        format: (amount) => `£${formatAmount(amount)}`
    },
    EUR: {
        symbol: '€',
        name: 'EUR',
        format: (amount) => `€${formatAmount(amount)}`
    }
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'CostParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try natural cost pattern first
        const naturalMatch = findNaturalCost(text);
        if (naturalMatch) {
            const correction = {
                type: 'cost_improvement',
                original: naturalMatch.match,
                correction: formatNaturalCost(naturalMatch),
                position: {
                    start: text.indexOf(naturalMatch.match),
                    end: text.indexOf(naturalMatch.match) + naturalMatch.match.length
                },
                confidence: naturalMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try currency pattern
        const currencyMatch = findCurrencyCost(text);
        if (currencyMatch) {
            const correction = {
                type: 'cost_currency_improvement',
                original: currencyMatch.match,
                correction: formatCurrencyCost(currencyMatch),
                position: {
                    start: text.indexOf(currencyMatch.match),
                    end: text.indexOf(currencyMatch.match) + currencyMatch.match.length
                },
                confidence: currencyMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try amount pattern
        const amountMatch = findAmountCost(text);
        if (amountMatch) {
            const correction = {
                type: 'cost_amount_improvement',
                original: amountMatch.match,
                correction: formatAmountCost(amountMatch),
                position: {
                    start: text.indexOf(amountMatch.match),
                    end: text.indexOf(amountMatch.match) + amountMatch.match.length
                },
                confidence: amountMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        return { text, corrections: [] };

    } catch (error) {
        logger.error('Error in cost parser:', error);
        return { text, corrections: [] };
    }
}

function findNaturalCost(text) {
    const pattern = /(?:costs?|price|budget|estimated)(?:\s*:\s*|\s+)(?:to\s+be\s+)?(?:[$£€])?(\d+(?:,\d{3})*(?:\.\d+)?k?)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const { amount, currency } = parseCostValue(match[1], match[0]);
    if (!validateAmount(amount)) return null;

    return {
        match: match[0],
        amount,
        currency,
        confidence: Confidence.HIGH
    };
}

function findCurrencyCost(text) {
    const pattern = /^(?:[$£€])(\d+(?:,\d{3})*(?:\.\d+)?k?)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const { amount, currency } = parseCostValue(match[1], match[0]);
    if (!validateAmount(amount)) return null;

    return {
        match: match[0],
        amount,
        currency,
        confidence: Confidence.HIGH
    };
}

function findAmountCost(text) {
    const pattern = /\b(?:amount|total|sum)(?:\s*:\s*|\s+)(?:of\s+)?(?:[$£€])?(\d+(?:,\d{3})*(?:\.\d+)?k?)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const { amount, currency } = parseCostValue(match[1], match[0]);
    if (!validateAmount(amount)) return null;

    return {
        match: match[0],
        amount,
        currency,
        confidence: Confidence.MEDIUM
    };
}

function formatNaturalCost({ amount, currency }) {
    return `Cost: ${CURRENCY_FORMATS[currency].format(amount)}`;
}

function formatCurrencyCost({ amount, currency }) {
    return CURRENCY_FORMATS[currency].format(amount);
}

function formatAmountCost({ amount, currency }) {
    return `Amount: ${CURRENCY_FORMATS[currency].format(amount)}`;
}

function parseCostValue(rawValue, fullMatch) {
    // Handle 'k' suffix for thousands
    let amount = parseFloat(rawValue.replace(/[,k]/gi, ''));
    if (rawValue.toLowerCase().endsWith('k')) {
        amount *= 1000;
    }

    // Extract currency symbol from full match if present
    const currencySymbol = fullMatch.match(/[$£€]/)?.[0];
    const currency = currencySymbol === '£' ? 'GBP' :
                    currencySymbol === '€' ? 'EUR' : 'USD';

    return { amount, currency };
}

function formatAmount(amount) {
    // Format with commas and two decimal places
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function validateAmount(amount) {
    return amount >= 0 && amount <= 999999999.99; // Max 999M
}
