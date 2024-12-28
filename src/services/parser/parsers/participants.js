import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ParticipantsParser');

export const name = 'participants';

const ROLE_EXPANSIONS = {
    'dev': 'Developer',
    'pm': 'Project Manager',
    'qa': 'QA Engineer',
    'lead': 'Team Lead',
    'mgr': 'Manager',
    'eng': 'Engineer',
    'admin': 'Administrator',
    'arch': 'Architect',
    'des': 'Designer',
    'ui': 'UI Designer',
    'ux': 'UX Designer',
    'ba': 'Business Analyst',
    'po': 'Product Owner',
    'sm': 'Scrum Master'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'ParticipantsParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try natural list pattern first
        const naturalList = findNaturalList(text);
        if (naturalList) {
            const correction = {
                type: 'participant_list_improvement',
                original: naturalList.match,
                correction: formatParticipantList(naturalList.participants),
                position: {
                    start: text.indexOf(naturalList.match),
                    end: text.indexOf(naturalList.match) + naturalList.match.length
                },
                confidence: naturalList.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try role assignments
        const roleMatch = findRoleAssignments(text);
        if (roleMatch) {
            const correction = {
                type: 'participant_role_improvement',
                original: roleMatch.match,
                correction: formatRoleAssignments(roleMatch.participants),
                position: {
                    start: text.indexOf(roleMatch.match),
                    end: text.indexOf(roleMatch.match) + roleMatch.match.length
                },
                confidence: roleMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try mentions
        const mentionsMatch = findMentions(text);
        if (mentionsMatch) {
            const correction = {
                type: 'participant_mention_improvement',
                original: mentionsMatch.match,
                correction: formatMentions(mentionsMatch.participants),
                position: {
                    start: text.indexOf(mentionsMatch.match),
                    end: text.indexOf(mentionsMatch.match) + mentionsMatch.match.length
                },
                confidence: mentionsMatch.confidence
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
        logger.error('Error in participants parser:', error);
        return { text, corrections: [] };
    }
}

function findNaturalList(text) {
    // Look for a list after "with", "includes", or "has" that contains commas
    const withMatch = text.match(/(?:with|includes?|has)\s+([A-Za-z][A-Za-z\s]*(?:\s*,\s*[A-Za-z][A-Za-z\s]*)*(?:\s*(?:,|and)\s+[A-Za-z][A-Za-z\s]*)?)\b/i);
    if (withMatch) {
        const listPart = withMatch[1];
        const participants = extractParticipants(listPart);
        if (participants.length >= 2) {
            return {
                match: withMatch[0],
                participants,
                confidence: Confidence.MEDIUM
            };
        }
    }

    // Look for a list after "with" (simpler pattern)
    const implicitMatch = text.match(/\bwith\s+([A-Za-z][A-Za-z\s]*(?:\s+and\s+[A-Za-z][A-Za-z\s]*)?)\b/i);
    if (implicitMatch) {
        const listPart = implicitMatch[1];
        const participants = extractParticipants(listPart);
        if (participants.length > 0) {
            return {
                match: implicitMatch[0],
                participants,
                confidence: Confidence.LOW
            };
        }
    }

    return null;
}

function findRoleAssignments(text) {
    const rolePattern = /(\w+)\s*\((\w+)\)(?:\s*(?:and|,)\s*(\w+)\s*\((\w+)\))?/i;
    const match = text.match(rolePattern);
    if (!match) return null;

    const participants = [];
    if (match[1] && match[2] && validateParticipantName(match[1]) && validateRole(match[2])) {
        participants.push({
            name: match[1],
            role: match[2]
        });
    }

    if (match[3] && match[4] && validateParticipantName(match[3]) && validateRole(match[4])) {
        participants.push({
            name: match[3],
            role: match[4]
        });
    }

    if (participants.length === 0) return null;

    return {
        match: match[0],
        participants,
        confidence: Confidence.HIGH
    };
}

function findMentions(text) {
    const mentionPattern = /@(\w+)(?:\s*(?:and|,)\s*@(\w+))?/i;
    const match = text.match(mentionPattern);
    if (!match) return null;

    const participants = [match[1]]
        .concat(match[2] ? [match[2]] : [])
        .filter(p => validateParticipantName(p));

    if (participants.length === 0) return null;

    return {
        match: match[0],
        participants,
        confidence: Confidence.HIGH
    };
}

function extractParticipants(text) {
    // First replace "and" with comma to standardize the format
    text = text.replace(/\s+and\s+/g, ', ');
    
    // Split on commas and clean up each part
    return text
        .split(/\s*,\s*/)
        .map(p => p.trim())
        .filter(p => validateParticipantName(p));
}

function formatParticipantList(participants) {
    if (participants.length === 0) return '';
    if (participants.length === 1) {
        return capitalizeName(participants[0]);
    }

    const capitalizedNames = participants.map(capitalizeName);
    const lastParticipant = capitalizedNames.pop();
    return `${capitalizedNames.join(', ')} and ${lastParticipant}`;
}

function formatRoleAssignments(participants) {
    return participants
        .map(p => `${capitalizeName(p.name)} (${expandRole(p.role)})`)
        .join(' and ');
}

function formatMentions(participants) {
    return participants
        .map(p => `@${capitalizeName(p)}`)
        .join(' and ');
}

function capitalizeName(name) {
    return name
        .split(/\s+/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function expandRole(role) {
    const normalized = role.toLowerCase();
    return ROLE_EXPANSIONS[normalized] || 
           (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase());
}

function validateParticipantName(name) {
    return /^[A-Za-z][A-Za-z\s]*[A-Za-z]$/.test(name);
}

function validateRole(role) {
    return /^[A-Za-z]+$/.test(role) || /^[A-Za-z]+=[A-Za-z]+$/.test(role);
}
