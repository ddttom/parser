import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ComplexityParser');

export const name = 'complexity';

const COMPLEXITY_FORMATS = {
    high: 'Complexity: High',
    medium: 'Complexity: Medium',
    low: 'Complexity: Low'
};

const COMPLEXITY_ALIASES = {
    'complex': 'high',
    'complicated': 'high',
    'difficult': 'high',
    'hard': 'high',
    'challenging': 'high',
    'advanced': 'high',
    'expert': 'high',
    'moderate': 'medium',
    'intermediate': 'medium',
    'normal': 'medium',
    'average': 'medium',
    'standard': 'medium',
    'simple': 'low',
    'easy': 'low',
    'basic': 'low',
    'beginner': 'low',
    'straightforward': 'low',
    'trivial': 'low'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'ComplexityParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try explicit complexity pattern first
        const explicitMatch = findExplicitComplexity(text);
        if (explicitMatch) {
            const correction = {
                type: 'complexity_improvement',
                original: explicitMatch.match,
                correction: formatExplicitComplexity(explicitMatch),
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

        // Try numeric complexity
        const numericMatch = findNumericComplexity(text);
        if (numericMatch) {
            const correction = {
                type: 'complexity_level_improvement',
                original: numericMatch.match,
                correction: formatNumericComplexity(numericMatch),
                position: {
                    start: text.indexOf(numericMatch.match),
                    end: text.indexOf(numericMatch.match) + numericMatch.match.length
                },
                confidence: numericMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try keyword complexity
        const keywordMatch = findKeywordComplexity(text);
        if (keywordMatch) {
            const correction = {
                type: 'complexity_improvement',
                original: keywordMatch.match,
                correction: formatKeywordComplexity(keywordMatch),
                position: {
                    start: text.indexOf(keywordMatch.match),
                    end: text.indexOf(keywordMatch.match) + keywordMatch.match.length
                },
                confidence: keywordMatch.confidence
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
        logger.error('Error in complexity parser:', error);
        return { text, corrections: [] };
    }
}

function findExplicitComplexity(text) {
    const pattern = /\b(?:complexity|difficulty)(?:\s+(?:is|level))?\s*(?::|-)?\s*(high|medium|low)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const level = match[1].toLowerCase();
    if (!validateComplexity(level)) return null;

    return {
        match: match[0],
        level,
        confidence: Confidence.HIGH
    };
}

function findNumericComplexity(text) {
    const pattern = /\b(?:complexity|difficulty)(?:\s+(?:is|level))?\s*(?::|-)?\s*(\d+)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const score = parseInt(match[1], 10);
    if (!validateNumericLevel(score)) return null;

    return {
        match: match[0],
        score,
        confidence: Confidence.HIGH
    };
}

function findKeywordComplexity(text) {
    const keywords = Object.keys(COMPLEXITY_ALIASES).join('|');
    const pattern = new RegExp(`\\b(${keywords})\\b`, 'i');
    const match = text.match(pattern);
    if (!match) return null;

    const keyword = match[1].toLowerCase();
    if (!validateKeyword(keyword)) return null;

    return {
        match: match[0],
        keyword,
        confidence: Confidence.MEDIUM
    };
}

function formatExplicitComplexity({ level }) {
    return COMPLEXITY_FORMATS[level];
}

function formatNumericComplexity({ score }) {
    const level = score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low';
    return COMPLEXITY_FORMATS[level];
}

function formatKeywordComplexity({ keyword }) {
    const level = COMPLEXITY_ALIASES[keyword.toLowerCase()];
    return COMPLEXITY_FORMATS[level];
}

function validateComplexity(level) {
    return level in COMPLEXITY_FORMATS;
}

function validateNumericLevel(score) {
    return score >= 1 && score <= 3;
}

function validateKeyword(keyword) {
    return keyword.toLowerCase() in COMPLEXITY_ALIASES;
}
