import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ContextParser');

export const name = 'context';

export async function parse(text) {
    const validationError = validateParserInput(text, 'ContextParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check preposition patterns
        const patterns = {
            at: /\bat\s+(?:the\s+)?([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            in: /\bin\s+(?:the\s+)?([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            during: /\bduring\s+(?:the\s+)?([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            using: /\busing\s+(?:the\s+)?([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            while_in: /\bwhile\s+in\s+(?:the\s+)?([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i,
            while_at: /\bwhile\s+at\s+(?:the\s+)?([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:,|\.|$|\bat\b|\bin\b|\bduring\b|\busing\b))/i
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
        location: /(?:room|office|building|home|work|desk|space|area)/i,
        time: /(?:morning|afternoon|evening|night|day|week|month|year)/i,
        tool: /(?:computer|laptop|phone|device|software|app|system)/i,
        activity: /(?:meeting|call|lunch|break|session|workshop|training)/i
    };

    for (const [type, pattern] of Object.entries(types)) {
        if (pattern.test(context)) {
            return type;
        }
    }

    return 'general';
}

function calculateConfidence(type, context) {
    // Well-known context types get HIGH confidence
    if (inferContextType(context) !== 'general') {
        return Confidence.HIGH;
    }
    
    // Common prepositions get MEDIUM confidence
    if (['at', 'in', 'during', 'using'].includes(type)) {
        return Confidence.MEDIUM;
    }
    
    // All other patterns get LOW confidence
    return Confidence.LOW;
}
