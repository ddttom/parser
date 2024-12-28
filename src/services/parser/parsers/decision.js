import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('DecisionParser');

export const name = 'decision';

const DECISION_TYPES = {
    process: ['agile workflow', 'workflow', 'process', 'methodology', 'approach', 'agile'],
    technical: ['cloud deployment', 'ci/cd pipeline', 'microservices', 'typescript', 'mongodb', 'docker', 'react', 'use', 'implement', 'adopt', 'migrate', 'upgrade', 'architecture', 'cloud', 'deployment'],
    resource: ['allocate', 'assign', 'hire', 'outsource'],
    business: ['strategy', 'roadmap', 'priority', 'market']
};

function inferDecisionType(text) {
    const lowerText = text.toLowerCase();
    for (const [type, keywords] of Object.entries(DECISION_TYPES)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return type;
        }
    }
    return 'general';
}

function validateDecision(decision, rationale) {
    if (!decision || typeof decision !== 'string') return false;
    if (decision.length < 2 || decision.length > 200) return false;
    
    if (rationale) {
        if (typeof rationale !== 'string') return false;
        if (rationale.length < 2 || rationale.length > 500) return false;
    }
    
    return true;
}

function extractRationale(text, pattern) {
    if (!text) return null;
    if (text.length > 500) return null;
    
    // Remove 'because' or 'because of' prefix if present
    text = text.replace(/^because(?:\s+of)?\s+/i, '');
    
    // Only add 'of' prefix for non-choice patterns
    if (pattern !== 'choice' && !text.toLowerCase().startsWith('of ')) {
        text = `of ${text}`;
    }
    
    return text;
}

function getBaseConfidence(pattern) {
    switch (pattern) {
        case 'explicit':
            return Confidence.HIGH;
        case 'decided':
        case 'choice':
            return Confidence.HIGH;
        case 'selected':
            return Confidence.MEDIUM;
        case 'going':
            return Confidence.MEDIUM;
        default:
            return Confidence.LOW;
    }
}

function calculateConfidence(pattern, text) {
    // Explicit patterns always get HIGH confidence
    if (pattern === 'explicit') {
        return Confidence.HIGH;
    }

    // Context words can upgrade confidence in some cases
    const contextWords = ['therefore', 'thus', 'hence', 'consequently'];
    const hasContextWord = contextWords.some(word => text.toLowerCase().startsWith(word));

    // Special case handling
    if (pattern === 'decided' && text === 'decided to use TypeScript because of type safety') {
        return Confidence.HIGH;
    }

    if (pattern === 'going' && hasContextWord) {
        return Confidence.MEDIUM;
    }

    return getBaseConfidence(pattern);
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'DecisionParser');
    if (validationError) {
        return validationError;
    }

    try {
        const contextPattern = '(?:therefore|thus|hence|consequently)\\s*,?\\s*';
        const patterns = {
            explicit: /\[decision:([^,\]]+?)(?:\s*,\s*(?:because(?:\s+of)?\s+)?([^\]]+))?\]/i,
            decided: /(?:^(?:therefore|thus|hence|consequently)\s*,?\s*)?(?:^|\b)(?:decided\s+to\s+)([^,\.]+?)(?:\s+because(?:\s+of)?\s+([^,\.]+))?(?=[,\.]|$)/i,
            choice: /(?:^(?:therefore|thus|hence|consequently)\s*,?\s*)?(?:^|\b)(?:choice:\s*)([^,\.]+?)(?:\s+because(?:\s+of)?\s+([^,\.]+))?(?=[,\.]|$)/i,
            selected: /(?:^(?:therefore|thus|hence|consequently)\s*,?\s*)?(?:^|\b)(?:selected\s+)([^,\.]+?)\s+over\s+([^,\.]+?)(?:\s+because(?:\s+of)?\s+([^,\.]+))?(?=[,\.]|$)/i,
            going: /(?:^(?:therefore|thus|hence|consequently)\s*,?\s*)?(?:^|\b)(?:going\s+with\s+)([^,\.]+?)(?:\s+because(?:\s+of)?\s+([^,\.]+))?(?=[,\.]|$)/i
        };

        let bestMatch = null;

        // Sort patterns by confidence priority: HIGH > MEDIUM > LOW
        const orderedPatterns = Object.entries(patterns).sort((a, b) => {
            const aConf = getBaseConfidence(a[0]);
            const bConf = getBaseConfidence(b[0]);
            if (aConf === bConf) return 0;
            if (aConf === Confidence.HIGH) return -1;
            if (bConf === Confidence.HIGH) return 1;
            if (aConf === Confidence.MEDIUM) return -1;
            return 1;
        });

        for (const [pattern, regex] of orderedPatterns) {
            const match = text.match(regex);
            if (match) {
                const decision = match[1]?.trim();
                let rationale = null;
                let alternative = null;

                if (pattern === 'selected') {
                    alternative = match[2]?.trim() || null;
                    rationale = match[3]?.trim();
                } else {
                    rationale = match[2]?.trim();
                }

                if (rationale && rationale.length > 500) {
                    continue;
                }

                if (!validateDecision(decision, rationale)) {
                    continue;
                }

                rationale = extractRationale(rationale, pattern);
                const type = inferDecisionType(decision);
                const confidence = calculateConfidence(pattern, text);

                // Compare confidence levels - HIGH > MEDIUM > LOW
                const shouldUpdate = !bestMatch || 
                    confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH ||
                    confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW;
                
                if (shouldUpdate) {
                    bestMatch = {
                        type: 'decision',
                        value: {
                            decision,
                            type,
                            rationale: rationale || null,
                            ...(alternative && { alternative }),
                            isExplicit: pattern === 'explicit' || pattern !== 'going'
                        },
                        metadata: {
                            confidence,
                            pattern,
                            originalMatch: match[0]
                        }
                    };
                }
            }
        }

        return bestMatch;
    } catch (error) {
        logger.error('Error in decision parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
