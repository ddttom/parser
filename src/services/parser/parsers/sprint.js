import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

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
    const validationError = validateParserInput(text, 'SprintParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Order matters - more specific patterns first
        const patterns = new Map([
            ['phase', /(?:sprint\s+(?:planning|review|retro(?:spective)?)|(?:planning|review|retro(?:spective)?)\s+for\s+sprint)\s+(\d+)(?:\s|$)/i],
            ['labeled', /^sprint\s+(\d+)(?:\s*([:-])\s*([^,\n]+))?/i],
            ['implicit', /\b(?:in|during|for)\s+sprint\s+(\d+)(?:\s|$)/i]
        ]);

        let bestMatch = null;

        for (const [pattern, regex] of patterns.entries()) {
            const match = text.match(regex);
            if (match) {
                let confidence;
                let value;
                const sprintNumber = parseInt(match[1], 10);

                if (!validateSprintNumber(sprintNumber)) {
                    continue;
                }

                switch (pattern) {
                    case 'phase': {
                        confidence = Confidence.MEDIUM;
                        const phaseText = match[0].toLowerCase();
                        let phase = 'general';
                        if (phaseText.includes('planning')) phase = 'planning';
                        else if (phaseText.includes('review')) phase = 'review';
                        else if (phaseText.includes('retro')) phase = 'retro';
                        
                        value = {
                            number: sprintNumber,
                            phase,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'labeled': {
                        confidence = Confidence.HIGH;
                        const separator = match[2];
                        const description = match[3]?.trim() || null;
                        value = {
                            number: sprintNumber,
                            phase: description ? inferSprintPhase(description) : 'general',
                            description,
                            isExplicit: true
                        };
                        break;
                    }

                    case 'implicit': {
                        confidence = Confidence.MEDIUM;
                        value = {
                            number: sprintNumber,
                            phase: 'general',
                            isExplicit: false
                        };
                        break;
                    }
                }

                // Don't let phase pattern override explicit or labeled if they match
                if (pattern === 'phase' && bestMatch && ['explicit', 'labeled'].includes(bestMatch.metadata.pattern)) {
                    continue;
                }

                // Update if current confidence is higher or equal priority pattern
                const shouldUpdate = !bestMatch || 
                    (confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
                    (confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW);
                
                if (shouldUpdate) {
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
