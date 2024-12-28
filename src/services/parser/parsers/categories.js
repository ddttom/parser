import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('CategoriesParser');

export const name = 'categories';

function isValidCategoryName(name) {
    // Must start with a letter
    if (!/^[a-zA-Z]/.test(name)) return false;
    
    // Only allow letters, numbers, spaces, and hyphens
    if (!/^[a-zA-Z][a-zA-Z0-9\s-]*$/.test(name)) return false;
    
    // Must be trimmed
    if (name.trim() !== name) return false;
    
    return true;
}

function validateCategory(category) {
    if (!category || typeof category !== 'string') return false;
    const parts = category.split('/').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return false;
    return parts.every(isValidCategoryName);
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'CategoriesParser');
    if (validationError) {
        return validationError;
    }

    const patterns = {
        hashtag_categories: /(?:#([a-zA-Z]\w*(?:\/[a-zA-Z]\w*)*)[\s,]*){2,}/i,
        nested_hashtag: /#([a-zA-Z]\w*(?:\/[a-zA-Z]\w*)+)\b/i,
        single_hashtag: /#([a-zA-Z]\w*)\b/i,
        category_list: /(?:categories?|tags?|under|in)(?:\s*:\s*|\s+)((?:[a-zA-Z]\w*(?:\s*,\s*[a-zA-Z]\w*)*))(?:\s|$)/i,
        nested_category: /(?:under|in|category|subcategory)(?:\s*:\s*|\s+)([a-zA-Z]\w*\/[a-zA-Z]\w*(?:\/[a-zA-Z]\w*)*)\b/i
    };

    try {
        // Try multiple hashtag categories first
        const multipleMatch = text.match(patterns.hashtag_categories);
        if (multipleMatch) {
            const hashtagRegex = /#([a-zA-Z]\w*(?:\/[a-zA-Z]\w*)*)\b/g;
            const categories = [];
            let m;
            while ((m = hashtagRegex.exec(text)) !== null) {
                const category = m[1].trim();
                if (validateCategory(category)) {
                    categories.push(category);
                }
            }
            if (categories.length >= 2) {
                return {
                    categories: {
                        categories,
                        confidence: Confidence.HIGH,
                        pattern: 'hashtag_categories',
                        originalMatch: multipleMatch[0]
                    }
                };
            }
        }

        // Try category list
        const listMatch = text.match(patterns.category_list);
        if (listMatch) {
            const categories = listMatch[1].split(',')
                .map(c => c.trim())
                .filter(c => isValidCategoryName(c));
            if (categories.length > 0) {
                return {
                    categories: {
                        categories,
                        confidence: Confidence.HIGH,
                        pattern: 'category_list',
                        originalMatch: listMatch[0]
                    }
                };
            }
        }

        // Try nested category patterns
        const nestedMatch = text.match(patterns.nested_category) || text.match(patterns.nested_hashtag);
        if (nestedMatch) {
            const parts = nestedMatch[1].split('/').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2 && parts.every(isValidCategoryName)) {
                return {
                    categories: {
                        category: parts[0],
                        subcategories: parts.slice(1),
                        confidence: Confidence.HIGH,
                        pattern: 'nested_category',
                        originalMatch: nestedMatch[0]
                    }
                };
            }
        }

        // Try single hashtag
        const hashtagMatch = text.match(patterns.single_hashtag);
        if (hashtagMatch) {
            const category = hashtagMatch[1];
            if (isValidCategoryName(category)) {
                return {
                    categories: {
                        category,
                        subcategories: [],
                        confidence: Confidence.MEDIUM,
                        pattern: 'single_hashtag',
                        originalMatch: hashtagMatch[0]
                    }
                };
            }
        }

        return null;
    } catch (error) {
        logger.error('Error in categories parser:', error);
        return null;
    }
}
