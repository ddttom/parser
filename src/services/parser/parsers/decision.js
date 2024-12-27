import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('DecisionParser');

export const name = 'decision';

const DECISION_TYPES = {
    technical: ['use', 'implement', 'adopt', 'migrate', 'upgrade', 'architecture'],
    process: ['workflow', 'process', 'methodology', 'approach'],
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

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    try {
        const patterns = {
            explicit: /\[decision:([^\]]+?)(?:\s*,\s*because\s+([^\]]+))?\]/i,
            decided: /decided\s+to\s+([^,\.]+?)(?:\s+because\s+([^,\.]+))?(?=[,\.]|$)/i,
            choice: /choice:\s*([^,\.]+?)(?:\s+because\s+([^,\.]+))?(?=[,\.]|$)/i,
            selected: /selected\s+([^,\.]+?)(?:\s+over\s+([^,\.]+))?(?:\s+because\s+([^,\.]+))?(?=[,\.]|$)/i,
            going: /going\s+with\s+([^,\.]+?)(?:\s+because\s+([^,\.]+))?(?=[,\.]|$)/i
        };

        let bestMatch = null;
        let highestConfidence = 0;

        for (const [pattern, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                let confidence;
                let value;

                const decision = match[1]?.trim();
                let rationale = match[2]?.trim();
                
                // Handle special case for 'selected' pattern which has an alternative option
                const alternative = pattern === 'selected' ? match[2]?.trim() : null;
                if (pattern === 'selected') {
                    rationale = match[3]?.trim();
                }

                if (!validateDecision(decision, rationale)) {
                    continue;
                }

                const type = inferDecisionType(decision);

                switch (pattern) {
                    case 'explicit': {
                        confidence = 0.95;
                        value = {
                            decision,
                            type,
                            rationale,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'decided':
                    case 'choice': {
                        confidence = 0.90;
                        value = {
                            decision,
                            type,
                            rationale,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'selected': {
                        confidence = 0.85;
                        value = {
                            decision,
                            type,
                            rationale,
                            alternative,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'going': {
                        confidence = 0.80;
                        value = {
                            decision,
                            type,
                            rationale,
                            isExplicit: false
                        };
                        break;
                    }
                }

                // Position-based confidence adjustment
                if (match.index === 0) {
                    confidence = Math.min(confidence + 0.05, 1.0);
                }

                // Context-based confidence adjustment
                const contextWords = ['therefore', 'thus', 'hence', 'consequently'];
                if (contextWords.some(word => text.toLowerCase().includes(word))) {
                    confidence = Math.min(confidence + 0.05, 1.0);
                }

                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    bestMatch = {
                        type: 'decision',
                        value,
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
