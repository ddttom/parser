import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TaskParser');

export const name = 'task';

export function validateTaskId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^\d+$/.test(id);
}

function formatTask(taskInfo) {
    return `task #${taskInfo.taskId}`;
}

export async function perfect(text) {
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
            const isValid = validateTaskId(taskId);
            if (!isValid) return { text, corrections: [] };

            const taskInfo = {
                taskId: parseInt(taskId, 10),
                pattern: 'inferred',
                confidence: Confidence.MEDIUM,
                originalMatch: inferredMatch[0]
            };

            const correction = {
                type: 'task',
                original: taskInfo.originalMatch,
                correction: formatTask(taskInfo),
                position: {
                    start: text.indexOf(taskInfo.originalMatch),
                    end: text.indexOf(taskInfo.originalMatch) + taskInfo.originalMatch.length
                },
                confidence: 'MEDIUM'
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

        return {
            text,
            corrections: []
        };
    } catch (error) {
        logger.error('Error in task parser:', error);
        throw error;
    }
}

// Make validateTaskId available for mocking in tests
perfect.validateTaskId = validateTaskId;
