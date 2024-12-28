import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

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
    const validationError = validateParserInput(text, 'VersionParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Parse version format
        const versionMatch = text.match(/\b(?:version|v)\s*(\d+\.\d+\.\d+)\b/i);
        if (versionMatch) {
            const version = versionMatch[1];
            // Call validateVersion directly to allow error propagation
            const isValid = parse.validateVersion(version);
            if (!isValid) return null;

            return {
                version: {
                    ...parseVersion(version),
                    pattern: 'version',
                    confidence: Confidence.HIGH,
                    originalMatch: versionMatch[0]
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in version parser:', error);
        return {
            version: {
                error: 'PARSER_ERROR',
                message: error.message
            }
        };
    }
}

// Make validateVersion available for mocking in tests
parse.validateVersion = validateVersion;
