import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';

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

function hasInvalidCategoryPattern(text) {
    // Check for empty category markers
    if (/\[category:\s*\]/.test(text)) return true;

    // Check for invalid category names in any category marker
    const categoryRegex = /\[category:([^\]]+)\]/g;
    let match;
    while ((match = categoryRegex.exec(text)) !== null) {
        const category = match[1].trim();
        if (!validateCategory(category)) {
            return true;
        }
    }

    return false;
}

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    // Check for invalid patterns first
    if (hasInvalidCategoryPattern(text)) {
        return null;
    }

    const patterns = {
        multiple_categories: /(?:\[category:([^\]]+)\][\s,]*){2,}/i,
        nested_category: /\[category:([^\]\/]+(?:\/[^\]\/]+)+)\]/i,
        explicit_category: /\[category:([^\]\/]+)\]/i,
        inferred_category: /#([a-zA-Z]\w*)/i
    };

    try {
        // Try multiple categories first
        const multipleMatch = text.match(patterns.multiple_categories);
        if (multipleMatch) {
            const categoryRegex = /\[category:([^\]]+)\]/g;
            const categories = [];
            let m;
            while ((m = categoryRegex.exec(text)) !== null) {
                const category = m[1].trim();
                categories.push(category);
            }
            if (categories.length >= 2) {
                return {
                    type: name,
                    value: { categories },
                    metadata: {
                        confidence: Confidence.HIGH,
                        pattern: 'multiple_categories',
                        originalMatch: multipleMatch[0]
                    }
                };
            }
        }

        // Try nested category
        const nestedMatch = text.match(patterns.nested_category);
        if (nestedMatch) {
            const parts = nestedMatch[1].split('/').map(p => p.trim()).filter(Boolean);
            if (parts.length < 2) {
                return null;
            }
            return {
                type: name,
                value: {
                    category: parts[0],
                    subcategories: parts.slice(1)
                },
                metadata: {
                    confidence: Confidence.HIGH, // Nested categories have high confidence
                    pattern: 'nested_category',
                    originalMatch: nestedMatch[0]
                }
            };
        }

        // Try explicit category
        const explicitMatch = text.match(patterns.explicit_category);
        if (explicitMatch) {
            const category = explicitMatch[1].trim();
            return {
                type: name,
                value: {
                    category,
                    subcategories: []
                },
                metadata: {
                    confidence: Confidence.HIGH,
                    pattern: 'explicit_category',
                    originalMatch: explicitMatch[0]
                }
            };
        }

        // Try inferred category
        const inferredMatch = text.match(patterns.inferred_category);
        if (inferredMatch) {
            const category = inferredMatch[1];
            if (!isValidCategoryName(category)) {
                return null;
            }
            return {
                type: name,
                value: {
                    category,
                    subcategories: []
                },
                metadata: {
                    confidence: Confidence.MEDIUM, // Inferred categories have medium confidence
                    pattern: 'inferred_category',
                    originalMatch: inferredMatch[0]
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in categories parser:', error);
        return null;
    }
}
