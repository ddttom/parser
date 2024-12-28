import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TagsParser');

export const name = 'tag';

const TAG_PREFIXES = {
    feature: 'Feature',
    bug: 'Bug',
    task: 'Task',
    docs: 'Documentation',
    test: 'Testing',
    refactor: 'Refactor',
    style: 'Style',
    perf: 'Performance',
    chore: 'Chore',
    build: 'Build',
    ci: 'CI',
    revert: 'Revert'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'TagsParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Find all hashtags in the text
        const tagMatches = findTags(text);
        if (!tagMatches || tagMatches.length === 0) {
            return { text, corrections: [] };
        }

        // Process each tag match
        let currentText = text;
        const corrections = [];

        for (const match of tagMatches) {
            const correction = {
                type: 'tag_improvement',
                original: match.match,
                correction: formatTag(match),
                position: {
                    start: currentText.indexOf(match.match),
                    end: currentText.indexOf(match.match) + match.match.length
                },
                confidence: match.confidence
            };

            // Update text and adjust positions for subsequent corrections
            const before = currentText.substring(0, correction.position.start);
            const after = currentText.substring(correction.position.end);
            currentText = before + correction.correction + after;

            corrections.push(correction);
        }

        return {
            text: currentText,
            corrections
        };

    } catch (error) {
        logger.error('Error in tags parser:', error);
        return { text, corrections: [] };
    }
}

function findTags(text) {
    const matches = [];
    let match;

    // Match hashtags with optional prefixes
    const tagPattern = /#([a-z0-9][a-z0-9_-]*)\b/ig;
    while ((match = tagPattern.exec(text)) !== null) {
        const tag = match[1];
        if (!validateTag(tag)) continue;

        matches.push({
            match: match[0],
            tag,
            confidence: Confidence.HIGH,
            index: match.index
        });
    }

    return matches;
}

function formatTag({ tag }) {
    // Convert to lowercase for consistent comparison
    const lowerTag = tag.toLowerCase();

    // Check if tag starts with a known prefix
    for (const [prefix, formatted] of Object.entries(TAG_PREFIXES)) {
        if (lowerTag.startsWith(prefix)) {
            // Split remaining part and format it
            const remaining = tag.slice(prefix.length);
            if (remaining) {
                // If there's remaining text, format it as PascalCase
                const formattedRemaining = remaining
                    .split(/[-_]/)
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                    .join('');
                return `#${formatted}${formattedRemaining}`;
            }
            // If no remaining text, just use the formatted prefix
            return `#${formatted}`;
        }
    }

    // For tags without known prefixes, convert to PascalCase
    const formatted = tag
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');

    return `#${formatted}`;
}

function validateTag(tag) {
    if (!tag || typeof tag !== 'string') return false;
    // Must start with letter/number and can contain letters, numbers, hyphens, and underscores
    return /^[a-z0-9][a-z0-9_-]*$/i.test(tag);
}
