import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';

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

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    try {
        const patterns = {
            explicit: /\[role:([^\]]+)\]/i,
            inferred: /\b(?:as|acting\s+as)\s+(\w+)\b/i
        };

        let bestMatch = null;

        for (const [pattern, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                let confidence;
                const role = match[1].toLowerCase();

                // Call validateRole directly to allow error propagation
                const isValid = parse.validateRole(role);
                if (!isValid) {
                    continue;
                }

                switch (pattern) {
                    case 'explicit': {
                        confidence = Confidence.HIGH;
                        break;
                    }
                    case 'inferred': {
                        confidence = Confidence.MEDIUM;
                        break;
                    }
                }

                // Update if current confidence is higher or equal priority pattern
                const shouldUpdate = !bestMatch || 
                    confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH ||
                    confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW;
                
                if (shouldUpdate) {
                    bestMatch = {
                        type: 'role',
                        value: {
                            role,
                            originalName: match[1]
                        },
                        metadata: {
                            confidence,
                            pattern,
                            originalMatch: match[0]
                        }
                    };
                }
            }
        }

        return bestMatch;
    } catch (error) {
        logger.error('Error in role parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}

// Make validateRole available for mocking in tests
parse.validateRole = validateRole;
