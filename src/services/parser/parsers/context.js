import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';

const logger = createLogger('ContextParser');

export const name = 'context';

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    try {
        // Check explicit pattern first
        const explicitMatch = text.match(/\[context:([^\]]*)\]/i);
        if (explicitMatch) {
            const context = explicitMatch[1].trim();
            if (!context) {
                return {
                    type: 'error',
                    error: 'INVALID_FORMAT',
                    message: 'Empty context value'
                };
            }
            return {
                type: 'context',
                value: {
                    context,
                    type: inferContextType(context)
                },
                metadata: {
                    confidence: calculateConfidence('explicit', context, explicitMatch),
                    pattern: 'explicit',
                    originalMatch: explicitMatch[0]
                }
            };
        }

        // Check for malformed explicit context
        if (text.includes('[context:') && !text.includes(']')) {
            return {
                type: 'error',
                error: 'INVALID_FORMAT',
                message: 'Invalid context format'
            };
        }

        // Check preposition patterns
        const patterns = {
            at: /\bat\s+([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            in: /\bin\s+([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            during: /\bduring\s+([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            using: /\busing\s+([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                const context = match[1].trim();
                if (context) {
                    return {
                        type: 'context',
                        value: {
                            context,
                            type: inferContextType(context)
                        },
                        metadata: {
                            confidence: calculateConfidence(type, context, match),
                            pattern: type,
                            originalMatch: match[0]
                        }
                    };
                }
            }
        }
        
        return null;
    } catch (error) {
        logger.error('Error in context parser:', {
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

function inferContextType(context) {
    const types = {
        location: /(?:room|office|building|home|work)/i,
        time: /(?:morning|afternoon|evening|night|day|week)/i,
        tool: /(?:computer|laptop|phone|device|software|app)/i,
        activity: /(?:meeting|call|lunch|break|session)/i
    };

    for (const [type, pattern] of Object.entries(types)) {
        if (pattern.test(context)) {
            return type;
        }
    }

    return 'general';
}

function calculateConfidence(type, context) {
    // Explicit patterns get HIGH confidence
    if (type === 'explicit') {
        return Confidence.HIGH;
    }
    
    // Well-known context types get MEDIUM confidence
    if (inferContextType(context) !== 'general') {
        return Confidence.MEDIUM;
    }
    
    // All other patterns get LOW confidence
    return Confidence.LOW;
}
