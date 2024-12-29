import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ContextParser');

export const name = 'context';

export async function perfect(text) {
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
                const contextStr = match[1].trim();
                if (contextStr) {
                    const contextType = inferContextType(contextStr);
                    const confidence = calculateConfidence(type, contextStr);
                    
                    const correction = {
                        type: 'context',
                        original: match[0],
                        correction: formatContext({ context: contextStr, type: contextType }),
                        position: {
                            start: text.indexOf(match[0]),
                            end: text.indexOf(match[0]) + match[0].length
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
        logger.error('Error in context parser:', {
            error: error.message,
            stack: error.stack,
            input: text
        });
        throw error;
    }
}

function formatContext(contextInfo) {
    const { context, type } = contextInfo;
    switch (type) {
        case 'location':
            return `at ${context}`;
        case 'time':
            return `during ${context}`;
        case 'tool':
            return `using ${context}`;
        case 'activity':
            return `during ${context}`;
        default:
            return `in ${context}`;
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
