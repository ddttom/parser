import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TaskParser');

export const name = 'task';

export function validateTaskId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^\d+$/.test(id);
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'TaskParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for task references
        const inferredMatch = text.match(/\b(?:task|ticket|issue)\s+#?(\d+)\b/i);
        if (inferredMatch) {
            const taskId = inferredMatch[1];
            // Call validateTaskId directly to allow error propagation
            const isValid = parse.validateTaskId(taskId);
            if (!isValid) return null;

            return {
                task: {
                    taskId: parseInt(taskId, 10),
                    pattern: 'inferred',
                    confidence: Confidence.MEDIUM,
                    originalMatch: inferredMatch[0]
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in task parser:', error);
        return {
            task: {
                error: 'PARSER_ERROR',
                message: error.message
            }
        };
    }
}

// Make validateTaskId available for mocking in tests
parse.validateTaskId = validateTaskId;
