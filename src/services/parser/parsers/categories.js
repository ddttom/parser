import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('CategoriesParser');

export const name = 'categories';

const CATEGORY_PREFIXES = {
    dev: 'Development',
    ui: 'UserInterface',
    api: 'API',
    db: 'Database',
    doc: 'Documentation',
    qa: 'QualityAssurance',
    ops: 'Operations',
    sec: 'Security',
    perf: 'Performance',
    arch: 'Architecture',
    infra: 'Infrastructure',
    maint: 'Maintenance',
    admin: 'Administration'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'CategoriesParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try multiple hashtag categories first
        const multipleMatch = findMultipleCategories(text);
        if (multipleMatch) {
            const correction = {
                type: 'categories_improvement',
                original: multipleMatch.match,
                correction: formatMultipleCategories(multipleMatch),
                position: {
                    start: text.indexOf(multipleMatch.match),
                    end: text.indexOf(multipleMatch.match) + multipleMatch.match.length
                },
                confidence: multipleMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try category list
        const listMatch = findCategoryList(text);
        if (listMatch) {
            const correction = {
                type: 'category_list_improvement',
                original: listMatch.match,
                correction: formatCategoryList(listMatch),
                position: {
                    start: text.indexOf(listMatch.match),
                    end: text.indexOf(listMatch.match) + listMatch.match.length
                },
                confidence: listMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try nested category
        const nestedMatch = findNestedCategory(text);
        if (nestedMatch) {
            const correction = {
                type: 'nested_category_improvement',
                original: nestedMatch.match,
                correction: formatNestedCategory(nestedMatch),
                position: {
                    start: text.indexOf(nestedMatch.match),
                    end: text.indexOf(nestedMatch.match) + nestedMatch.match.length
                },
                confidence: nestedMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try single category
        const singleMatch = findSingleCategory(text);
        if (singleMatch) {
            const correction = {
                type: 'category_improvement',
                original: singleMatch.match,
                correction: formatSingleCategory(singleMatch),
                position: {
                    start: text.indexOf(singleMatch.match),
                    end: text.indexOf(singleMatch.match) + singleMatch.match.length
                },
                confidence: singleMatch.confidence
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
        logger.error('Error in categories parser:', error);
        return { text, corrections: [] };
    }
}

function findMultipleCategories(text) {
    const pattern = /(?:#([a-zA-Z]\w*(?:\/[a-zA-Z]\w*)*)[\s,]*){2,}/i;
    const match = text.match(pattern);
    if (!match) return null;

    const hashtagRegex = /#([a-zA-Z]\w*(?:\/[a-zA-Z]\w*)*)\b/g;
    const categories = [];
    let m;
    while ((m = hashtagRegex.exec(match[0])) !== null) {
        const category = m[1].trim();
        if (validateCategory(category)) {
            categories.push(category);
        }
    }

    if (categories.length < 2) return null;

    return {
        match: match[0],
        categories,
        confidence: Confidence.HIGH
    };
}

function findCategoryList(text) {
    const pattern = /(?:categories?|tags?|under|in)(?:\s*:\s*|\s+)((?:[a-zA-Z]\w*(?:\s*,\s*[a-zA-Z]\w*)*))(?:\s|$)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const categories = match[1].split(',')
        .map(c => c.trim())
        .filter(isValidCategoryName);

    if (categories.length === 0) return null;

    return {
        match: match[0],
        categories,
        confidence: Confidence.HIGH
    };
}

function findNestedCategory(text) {
    const pattern = /(?:under|in|category|subcategory)(?:\s*:\s*|\s+)([a-zA-Z]\w*\/[a-zA-Z]\w*(?:\/[a-zA-Z]\w*)*)\b/i;
    const hashtagPattern = /#([a-zA-Z]\w*(?:\/[a-zA-Z]\w*)+)\b/i;
    
    const match = text.match(pattern) || text.match(hashtagPattern);
    if (!match) return null;

    const parts = match[1].split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2 || !parts.every(isValidCategoryName)) return null;

    return {
        match: match[0],
        parts,
        confidence: Confidence.HIGH
    };
}

function findSingleCategory(text) {
    const pattern = /#([a-zA-Z]\w*)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const category = match[1];
    if (!isValidCategoryName(category)) return null;

    return {
        match: match[0],
        category,
        confidence: Confidence.MEDIUM
    };
}

function formatMultipleCategories({ categories }) {
    return categories
        .map(category => formatCategoryName(category))
        .map(category => `#${category}`)
        .join(' ');
}

function formatCategoryList({ categories }) {
    const formatted = categories
        .map(category => formatCategoryName(category))
        .join(', ');
    return `Categories: ${formatted}`;
}

function formatNestedCategory({ parts }) {
    const formatted = parts
        .map(part => formatCategoryName(part))
        .join('/');
    return `Category: ${formatted}`;
}

function formatSingleCategory({ category }) {
    return `#${formatCategoryName(category)}`;
}

function formatCategoryName(category) {
    // Check for known prefixes
    const lowerCategory = category.toLowerCase();
    for (const [prefix, formatted] of Object.entries(CATEGORY_PREFIXES)) {
        if (lowerCategory.startsWith(prefix)) {
            const remaining = category.slice(prefix.length);
            if (!remaining) return formatted;
            
            // Format remaining part in PascalCase
            const formattedRemaining = remaining
                .split(/[-_]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join('');
            return `${formatted}${formattedRemaining}`;
        }
    }

    // Convert to PascalCase for unknown categories
    return category
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}

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
