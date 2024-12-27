import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('SprintParser');

export const name = 'sprint';

const SPRINT_KEYWORDS = {
    start: ['start', 'begin', 'beginning'],
    end: ['end', 'finish', 'completion'],
    planning: ['planning', 'plan'],
    review: ['review', 'demo'],
    retro: ['retrospective', 'retro']
};

function inferSprintPhase(text) {
    const lowerText = text.toLowerCase();
    for (const [phase, keywords] of Object.entries(SPRINT_KEYWORDS)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return phase;
        }
    }
    return 'general';
}

function validateSprintNumber(number) {
    // Sprint number must be a positive integer
    return Number.isInteger(number) && number > 0 && number <= 999;
}

function extractSprintNumber(text) {
    const match = text.match(/\b(?:sprint\s*)?(\d+)\b/i);
    if (!match) return null;
    
    const number = parseInt(match[1], 10);
    return validateSprintNumber(number) ? number : null;
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
            explicit: /\[sprint:(\d+)(?:\s*,\s*([^\]]+))?\]/i,
            labeled: /sprint\s+(\d+)(?:\s*[-:]\s*([^,\n]+))?/i,
            phase: /sprint\s+(?:planning|review|retro(?:spective)?)\s+(?:for\s+)?(?:sprint\s+)?(\d+)/i,
            implicit: /\bin\s+sprint\s+(\d+)\b/i
        };

        let bestMatch = null;
        let highestConfidence = 0;

        for (const [pattern, regex] of Object.entries(patterns)) {
            const match = text.match(regex);
            if (match) {
                let confidence;
                let value;
                const sprintNumber = parseInt(match[1], 10);

                if (!validateSprintNumber(sprintNumber)) {
                    continue;
                }

                const description = match[2]?.trim() || null;
                const phase = description ? inferSprintPhase(description) : 'general';

                switch (pattern) {
                    case 'explicit': {
                        confidence = 0.95;
                        value = {
                            number: sprintNumber,
                            phase,
                            description,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'labeled': {
                        confidence = 0.90;
                        value = {
                            number: sprintNumber,
                            phase,
                            description,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'phase': {
                        confidence = 0.85;
                        value = {
                            number: sprintNumber,
                            phase: inferSprintPhase(match[0]),
                            isExplicit: true
                        };
                        break;
                    }

                    case 'implicit': {
                        confidence = 0.80;
                        value = {
                            number: sprintNumber,
                            phase: 'general',
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
                const contextWords = ['planning', 'review', 'retro', 'demo'];
                if (contextWords.some(word => text.toLowerCase().includes(word))) {
                    confidence = Math.min(confidence + 0.05, 1.0);
                }

                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    bestMatch = {
                        type: 'sprint',
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
        logger.error('Error in sprint parser:', error);
        return {
            type: 'error',
            error: 'PARSER_ERROR',
            message: error.message
        };
    }
}
