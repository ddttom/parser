import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('TagsParser');

export const name = 'tag';

function validateTag(tag) {
    if (!tag || typeof tag !== 'string') return false;
    return /^[a-z0-9][a-z0-9_-]*$/i.test(tag);
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
        // Check for explicit tag format
        const explicitMatch = text.match(/\[tag:([^\]]+)\]/i);
        if (explicitMatch) {
            const tag = explicitMatch[1].trim();
            if (!validateTag(tag)) return null;

            return {
                type: 'tag',
                value: [tag],
                metadata: {
                    pattern: 'explicit_tag',
                    confidence: 0.95,
                    originalMatch: explicitMatch[0]
                }
            };
        }

        // Check for hashtags
        const hashtagMatches = text.match(/#([a-z0-9][a-z0-9_-]*)\b/ig);
        if (hashtagMatches) {
            const tags = hashtagMatches
                .map(tag => tag.slice(1)) // Remove #
                .filter(validateTag);

            if (tags.length === 0) return null;

            return {
                type: 'tag',
                value: tags,
                metadata: {
                    pattern: 'hashtag',
                    confidence: 0.8,
                    originalMatch: hashtagMatches.join(' ')
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in tags parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
