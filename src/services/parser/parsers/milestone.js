import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';

const logger = createLogger('MilestoneParser');

export const name = 'milestone';

const MILESTONE_TYPES = {
    release: ['release', 'launch', 'deployment', 'rollout'],
    review: ['review', 'assessment', 'evaluation'],
    delivery: ['delivery', 'handoff', 'handover'],
    completion: ['completion', 'finished', 'done', 'complete']
};

function inferMilestoneType(text) {
    const lowerText = text.toLowerCase();
    for (const [type, keywords] of Object.entries(MILESTONE_TYPES)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return type;
        }
    }
    return 'general';
}

function validateMilestone(milestone) {
    if (!milestone || typeof milestone !== 'string') return false;
    // Must be non-empty and not just whitespace
    if (!milestone.trim()) return false;
    // Must not be too long
    if (milestone.length > 100) return false;
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
            explicit: /\[milestone:([^\]]+)\]/i,
            labeled: /milestone:\s*([^,\n]+)/i,
            delivery: /(?:key\s+)?delivery:\s*([^,\n]+)/i,
            phase: /phase\s+completion:\s*([^,\n]+)/i,
            implicit: /\b(?:target):\s*([^,\n]+)/i
        };

        let bestMatch = null;
        let highestConfidence = Confidence.LOW;

        for (const [pattern, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                let confidence;
                let value;
                const milestone = match[1].trim();

                if (!validateMilestone(milestone)) {
                    continue;
                }

                const type = inferMilestoneType(milestone);

                switch (pattern) {
                    case 'explicit': {
                        confidence = Confidence.HIGH;
                        value = {
                            milestone,
                            type,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'labeled': {
                        confidence = Confidence.HIGH;
                        value = {
                            milestone,
                            type,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'delivery': {
                        confidence = Confidence.HIGH;
                        value = {
                            milestone,
                            type: 'delivery',
                            isExplicit: true
                        };
                        break;
                    }

                    case 'phase': {
                        confidence = Confidence.MEDIUM;
                        value = {
                            milestone,
                            type: 'phase',
                            isExplicit: true
                        };
                        break;
                    }

                    case 'implicit': {
                        confidence = Confidence.MEDIUM;
                        value = {
                            milestone,
                            type,
                            isExplicit: false
                        };
                        break;
                    }
                }

                // Update if current confidence is higher or equal priority pattern
                const shouldUpdate = !bestMatch || 
                    (confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
                    (confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW);
                
                if (shouldUpdate) {
                    highestConfidence = confidence;
                    bestMatch = {
                        type: 'milestone',
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
        logger.error('Error in milestone parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
