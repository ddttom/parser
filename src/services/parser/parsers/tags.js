import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TagsParser');

export const name = 'tag';

function validateTag(tag) {
    if (!tag || typeof tag !== 'string') return false;
    return /^[a-z0-9][a-z0-9_-]*$/i.test(tag);
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'TagsParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for hashtags
        const hashtagMatches = text.match(/#([a-z0-9][a-z0-9_-]*)\b/ig);
        if (hashtagMatches) {
            const tags = hashtagMatches
                .map(tag => tag.slice(1)) // Remove #
                .filter(validateTag);

            if (tags.length === 0) return null;

            return {
                tag: {
                    tags,
                    pattern: 'hashtag',
                    confidence: Confidence.MEDIUM,
                    originalMatch: hashtagMatches.join(' ')
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in tags parser:', error);
        return {
            tag: {
                error: 'PARSER_ERROR',
                message: error.message
            }
        };
    }
}
