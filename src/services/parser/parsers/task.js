import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';

const logger = createLogger('TaskParser');

export const name = 'task';

export function validateTaskId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^\d+$/.test(id);
}

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    try {
        // Check for explicit task format
        const explicitMatch = text.match(/\[task:(\d+)\]/i);
        if (explicitMatch) {
            const taskId = explicitMatch[1];
            // Call validateTaskId directly to allow error propagation
            const isValid = parse.validateTaskId(taskId);
            if (!isValid) return null;

            return {
                type: 'task',
                value: {
                    taskId: parseInt(taskId, 10)
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: Confidence.HIGH,
                    originalMatch: explicitMatch[0]
                }
            };
        }

        // Check for inferred task references
        const inferredMatch = text.match(/\b(?:task|ticket|issue)\s+#?(\d+)\b/i);
        if (inferredMatch) {
            const taskId = inferredMatch[1];
            // Call validateTaskId directly to allow error propagation
            const isValid = parse.validateTaskId(taskId);
            if (!isValid) return null;

            return {
                type: 'task',
                value: {
                    taskId: parseInt(taskId, 10)
                },
                metadata: {
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
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}

// Make validateTaskId available for mocking in tests
parse.validateTaskId = validateTaskId;
