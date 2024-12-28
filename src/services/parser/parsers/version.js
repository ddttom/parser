import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('VersionParser');

export const name = 'version';

const VERSION_PREFIXES = {
    'v': 'Version',
    'ver': 'Version',
    'version': 'Version',
    'rel': 'Release',
    'release': 'Release',
    'build': 'Build'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'VersionParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try explicit version pattern first
        const explicitMatch = findExplicitVersion(text);
        if (explicitMatch) {
            const correction = {
                type: 'version_improvement',
                original: explicitMatch.match,
                correction: formatExplicitVersion(explicitMatch),
                position: {
                    start: text.indexOf(explicitMatch.match),
                    end: text.indexOf(explicitMatch.match) + explicitMatch.match.length
                },
                confidence: explicitMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try implicit version pattern
        const implicitMatch = findImplicitVersion(text);
        if (implicitMatch) {
            const correction = {
                type: 'version_improvement',
                original: implicitMatch.match,
                correction: formatImplicitVersion(implicitMatch),
                position: {
                    start: text.indexOf(implicitMatch.match),
                    end: text.indexOf(implicitMatch.match) + implicitMatch.match.length
                },
                confidence: implicitMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        return { text, corrections: [] };

    } catch (error) {
        logger.error('Error in version parser:', error);
        return { text, corrections: [] };
    }
}

function findExplicitVersion(text) {
    const pattern = /\b(?:version|v|ver|release|rel|build)\s*[:-]?\s*(\d+\.\d+\.\d+)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const version = match[1];
    if (!validateVersion(version)) return null;

    const prefix = match[0].slice(0, match[0].indexOf(version)).trim().toLowerCase();
    const prefixMatch = Object.keys(VERSION_PREFIXES).find(p => prefix.includes(p));

    return {
        match: match[0],
        version,
        prefix: prefixMatch || 'version',
        confidence: Confidence.HIGH
    };
}

function findImplicitVersion(text) {
    const pattern = /\b(\d+\.\d+\.\d+)\b/;
    const match = text.match(pattern);
    if (!match) return null;

    const version = match[1];
    if (!validateVersion(version)) return null;

    return {
        match: match[0],
        version,
        confidence: Confidence.MEDIUM
    };
}

function formatExplicitVersion({ version, prefix }) {
    const formattedPrefix = VERSION_PREFIXES[prefix] || 'Version';
    return `${formattedPrefix}: ${version}`;
}

function formatImplicitVersion({ version }) {
    return `Version: ${version}`;
}

function validateVersion(version) {
    if (!version || typeof version !== 'string') return false;
    // Semantic versioning: MAJOR.MINOR.PATCH
    return /^\d+\.\d+\.\d+$/.test(version);
}

function parseVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return { major, minor, patch };
}
