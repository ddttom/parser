import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('VersionParser');

export const name = 'version';

export function validateVersion(version) {
    if (!version || typeof version !== 'string') return false;
    // Semantic versioning: MAJOR.MINOR.PATCH
    return /^\d+\.\d+\.\d+$/.test(version);
}

function parseVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return { major, minor, patch };
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
        // Check for explicit version format
        const explicitMatch = text.match(/\[version:([^\]]+)\]/i);
        if (explicitMatch) {
            const version = explicitMatch[1].trim();
            // Call validateVersion directly to allow error propagation
            const isValid = parse.validateVersion(version);
            if (!isValid) return null;

            return {
                type: 'version',
                value: parseVersion(version),
                metadata: {
                    pattern: 'explicit_version',
                    confidence: 0.95,
                    originalMatch: explicitMatch[0]
                }
            };
        }

        // Check for inferred version format
        const inferredMatch = text.match(/\b(?:version|v)\s*(\d+\.\d+\.\d+)\b/i);
        if (inferredMatch) {
            const version = inferredMatch[1];
            // Call validateVersion directly to allow error propagation
            const isValid = parse.validateVersion(version);
            if (!isValid) return null;

            return {
                type: 'version',
                value: parseVersion(version),
                metadata: {
                    pattern: 'inferred_version',
                    confidence: 0.80,
                    originalMatch: inferredMatch[0]
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in version parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}

// Make validateVersion available for mocking in tests
parse.validateVersion = validateVersion;
