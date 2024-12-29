import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('RoleParser');

export const name = 'role';

const VALID_ROLES = new Set([
    'developer',
    'designer',
    'manager',
    'tester',
    'analyst',
    'admin',
    'lead',
    'coordinator',
    'consultant'
]);

export function validateRole(role) {
    if (!role || typeof role !== 'string') return false;
    return VALID_ROLES.has(role.toLowerCase());
}

function formatRole(roleInfo) {
    return `as ${roleInfo.role}`;
}

export async function perfect(text) {
    const validationError = validateParserInput(text, 'RoleParser');
    if (validationError) {
        return validationError;
    }

    try {
        const patterns = {
            inferred: /\b(?:as|acting\s+as)\s+(\w+)\b/i
        };

        for (const [pattern, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                const role = match[1].toLowerCase();

                // Call validateRole directly to allow error propagation
                const isValid = validateRole(role);
                if (!isValid) continue;

                const roleInfo = {
                    role,
                    originalName: match[1],
                    confidence: Confidence.HIGH,
                    pattern,
                    originalMatch: match[0]
                };

                const correction = {
                    type: 'role',
                    original: roleInfo.originalMatch,
                    correction: formatRole(roleInfo),
                    position: {
                        start: text.indexOf(roleInfo.originalMatch),
                        end: text.indexOf(roleInfo.originalMatch) + roleInfo.originalMatch.length
                    },
                    confidence: 'HIGH'
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

        return {
            text,
            corrections: []
        };
    } catch (error) {
        logger.error('Error in role parser:', error);
        throw error;
    }
}

// Make validateRole available for mocking in tests
perfect.validateRole = validateRole;
