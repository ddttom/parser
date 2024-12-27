import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('CostParser');

export const name = 'cost';

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    const patterns = {
        explicit: /\[cost:([^[\]]+)\]/i,
        natural: /(?:costs?|price|budget|estimated)(?:\s*:\s*|\s+)(?:to\s+be\s+)?(?:[$£€])?(\d+(?:,\d{3})*(?:\.\d+)?k?)\b/i,
        currency: /^(?:[$£€])(\d+(?:\.\d+)?k?)\b/i
    };

    try {
        // Try patterns in order of precedence
        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                const rawValue = match[1].trim();

                try {
                    // Validate format and extract value
                    const formatMatch = rawValue.trim().match(/^(?:([$£€])?)?(\d+(?:,\d{3})*(?:\.\d+)?k?)\b/i);
                    if (!formatMatch) {
                        return {
                            type: 'error',
                            error: 'PARSER_ERROR',
                            message: 'Invalid cost format'
                        };
                    }

                    const [, formatCurrencySymbol, numericPart] = formatMatch;
                    // Handle 'k' suffix for thousands
                    let value = parseFloat(numericPart.replace(/[,k]/gi, ''));
                    if (numericPart.toLowerCase().endsWith('k')) {
                        value *= 1000;
                    }

                    // Validate numeric value
                    if (value < 0) {
                        return {
                            type: 'error',
                            error: 'PARSER_ERROR',
                            message: 'Negative values not allowed'
                        };
                    }

                    // Validate decimal places
                    if (numericPart.includes('.') && !/\.\d{2}$/.test(numericPart)) {
                        return {
                            type: 'error',
                            error: 'PARSER_ERROR',
                            message: 'Invalid decimal format'
                        };
                    }

                    // Extract currency symbol from full match if present
                    const matchCurrencySymbol = match[0].match(/[$£€]/)?.[0];
                    const currency = matchCurrencySymbol === '$' ? 'USD' : 
                                   matchCurrencySymbol === '£' ? 'GBP' :
                                   matchCurrencySymbol === '€' ? 'EUR' : 'USD';
                    return {
                        type: 'cost',
                        value: {
                            amount: value,
                            currency
                        },
                        metadata: {
                            confidence: type === 'explicit' ? 0.95 : 
                                      type === 'natural' ? 0.8 : 
                                      type === 'currency' ? 0.9 : 0.8,
                            pattern: type,
                            originalMatch: match[0]
                        }
                    };
                } catch (error) {
                    return {
                        type: 'error',
                        error: 'PARSER_ERROR',
                        message: error.message
                    };
                }
            }
        }
        
        return null;
    } catch (error) {
        logger.error('Error in cost parser:', {
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
