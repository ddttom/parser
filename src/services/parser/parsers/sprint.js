import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('SprintParser');

export const name = 'sprint';

const SPRINT_PHASES = {
    'start': 'Sprint Start',
    'begin': 'Sprint Start',
    'beginning': 'Sprint Start',
    'end': 'Sprint End',
    'finish': 'Sprint End',
    'completion': 'Sprint End',
    'planning': 'Sprint Planning',
    'plan': 'Sprint Planning',
    'review': 'Sprint Review',
    'demo': 'Sprint Review',
    'retrospective': 'Sprint Retrospective',
    'retro': 'Sprint Retrospective'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'SprintParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try phase-specific patterns first
        const phaseMatch = findSprintPhase(text);
        if (phaseMatch) {
            const correction = {
                type: 'sprint_phase_improvement',
                original: phaseMatch.match,
                correction: formatSprintPhase(phaseMatch),
                position: {
                    start: text.indexOf(phaseMatch.match),
                    end: text.indexOf(phaseMatch.match) + phaseMatch.match.length
                },
                confidence: phaseMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try labeled sprint references
        const labeledMatch = findLabeledSprint(text);
        if (labeledMatch) {
            const correction = {
                type: 'sprint_label_improvement',
                original: labeledMatch.match,
                correction: formatLabeledSprint(labeledMatch),
                position: {
                    start: text.indexOf(labeledMatch.match),
                    end: text.indexOf(labeledMatch.match) + labeledMatch.match.length
                },
                confidence: labeledMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try implicit sprint references
        const implicitMatch = findImplicitSprint(text);
        if (implicitMatch) {
            const correction = {
                type: 'sprint_reference_improvement',
                original: implicitMatch.match,
                correction: formatImplicitSprint(implicitMatch),
                position: {
                    start: text.indexOf(implicitMatch.match),
                    end: text.indexOf(implicitMatch.match) + implicitMatch.match.length
                },
                confidence: implicitMatch.confidence
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
        logger.error('Error in sprint parser:', error);
        return { text, corrections: [] };
    }
}

function findSprintPhase(text) {
    const pattern = /\b(?:(sprint\s+(?:planning|review|retro(?:spective)?)|(?:planning|review|retro(?:spective)?)\s+for\s+sprint))\s+(\d+)(?:\s|$)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const sprintNumber = parseInt(match[2], 10);
    if (!validateSprintNumber(sprintNumber)) return null;

    const phaseText = match[1].toLowerCase();
    let phase = 'general';
    if (phaseText.includes('planning')) phase = 'planning';
    else if (phaseText.includes('review')) phase = 'review';
    else if (phaseText.includes('retro')) phase = 'retro';

    return {
        match: match[0],
        sprintNumber,
        phase,
        confidence: Confidence.HIGH
    };
}

function findLabeledSprint(text) {
    const pattern = /^sprint\s+(\d+)(?:\s*([:-])\s*([^,\n]+))?/i;
    const match = text.match(pattern);
    if (!match) return null;

    const sprintNumber = parseInt(match[1], 10);
    if (!validateSprintNumber(sprintNumber)) return null;

    return {
        match: match[0],
        sprintNumber,
        separator: match[2],
        description: match[3]?.trim(),
        confidence: Confidence.HIGH
    };
}

function findImplicitSprint(text) {
    const pattern = /\b(?:in|during|for)\s+sprint\s+(\d+)(?:\s|$)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const sprintNumber = parseInt(match[1], 10);
    if (!validateSprintNumber(sprintNumber)) return null;

    return {
        match: match[0],
        sprintNumber,
        confidence: Confidence.MEDIUM
    };
}

function formatSprintPhase({ sprintNumber, phase }) {
    const phaseText = phase === 'retro' ? 'Retrospective' :
                     phase === 'review' ? 'Review' :
                     phase === 'planning' ? 'Planning' : '';
    return `Sprint ${sprintNumber} ${phaseText}`;
}

function formatLabeledSprint({ sprintNumber, separator, description }) {
    let formatted = `Sprint ${sprintNumber}`;
    if (description) {
        // Try to expand any phase references in the description
        const expandedDescription = description.split(/\s+/)
            .map(word => SPRINT_PHASES[word.toLowerCase()] || word)
            .join(' ');
        formatted += `${separator} ${expandedDescription}`;
    }
    return formatted;
}

function formatImplicitSprint({ sprintNumber, match }) {
    // Preserve the preposition but standardize the sprint reference
    const preposition = match.match(/^(in|during|for)/i)[0];
    return `${preposition} Sprint ${sprintNumber}`;
}

function validateSprintNumber(number) {
    return Number.isInteger(number) && number > 0 && number <= 999;
}
