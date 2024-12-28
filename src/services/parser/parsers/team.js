import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TeamParser');

export const name = 'team';

const TEAM_EXPANSIONS = {
    'fe': 'Frontend',
    'frontend': 'Frontend',
    'be': 'Backend',
    'backend': 'Backend',
    'ui': 'UI/UX Design',
    'ux': 'UI/UX Design',
    'design': 'UI/UX Design',
    'qa': 'Quality Assurance',
    'qe': 'Quality Engineering',
    'devops': 'DevOps',
    'dev': 'Development',
    'mobile': 'Mobile Development',
    'infra': 'Infrastructure',
    'infrastructure': 'Infrastructure',
    'sec': 'Security',
    'security': 'Security',
    'data': 'Data Science',
    'ds': 'Data Science',
    'ml': 'Machine Learning',
    'platform': 'Platform Engineering',
    'arch': 'Architecture',
    'sre': 'Site Reliability Engineering',
    'cloud': 'Cloud Infrastructure'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'TeamParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try team name with "team" suffix
        const teamMatch = findTeamReference(text);
        if (teamMatch) {
            const correction = {
                type: 'team_improvement',
                original: teamMatch.match,
                correction: formatTeamReference(teamMatch),
                position: {
                    start: text.indexOf(teamMatch.match),
                    end: text.indexOf(teamMatch.match) + teamMatch.match.length
                },
                confidence: teamMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try team mentions
        const mentionsMatch = findTeamMentions(text);
        if (mentionsMatch) {
            const correction = {
                type: 'team_mention_improvement',
                original: mentionsMatch.match,
                correction: formatTeamMentions(mentionsMatch),
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

        // Try team member list
        const membersMatch = findTeamMembers(text);
        if (membersMatch) {
            const correction = {
                type: 'team_members_improvement',
                original: membersMatch.match,
                correction: formatTeamMembers(membersMatch),
                position: {
                    start: text.indexOf(membersMatch.match),
                    end: text.indexOf(membersMatch.match) + membersMatch.match.length
                },
                confidence: membersMatch.confidence
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
        logger.error('Error in team parser:', error);
        return { text, corrections: [] };
    }
}

function findTeamReference(text) {
    const pattern = /\b([a-z0-9_/-]+)(?:\s+team)?\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const teamName = match[1].toLowerCase();
    if (!TEAM_EXPANSIONS[teamName]) return null;

    return {
        match: match[0],
        teamName,
        confidence: match[0].toLowerCase().includes('team') ? 
            Confidence.HIGH : Confidence.MEDIUM
    };
}

function findTeamMentions(text) {
    const pattern = /@([a-z0-9_/-]+)(?:\s*(?:,\s*@[a-z0-9_/-]+)*(?:\s+and\s+@[a-z0-9_/-]+)?)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const mentions = match[0].match(/@[a-z0-9_/-]+/g);
    if (!mentions) return null;

    return {
        match: match[0],
        mentions: mentions.map(m => m.substring(1)),
        confidence: Confidence.HIGH
    };
}

function findTeamMembers(text) {
    const pattern = /\b(?:involving|with)\s+([a-z][a-z\s]*(?:\s*,\s*[a-z][a-z\s]*)*(?:\s+and\s+[a-z][a-z\s]*)?)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const members = match[1]
        .split(/\s*,\s*|\s+and\s+/)
        .map(m => m.trim())
        .filter(m => m.length > 0);

    if (members.length === 0) return null;

    return {
        match: match[0],
        members,
        confidence: Confidence.MEDIUM
    };
}

function formatTeamReference({ teamName }) {
    const expanded = TEAM_EXPANSIONS[teamName];
    return `${expanded} Team`;
}

function formatTeamMentions({ mentions }) {
    const expandedMentions = mentions
        .map(m => TEAM_EXPANSIONS[m.toLowerCase()] || m)
        .map(m => `@${m}`);

    if (expandedMentions.length === 1) {
        return expandedMentions[0];
    }

    const last = expandedMentions.pop();
    return `${expandedMentions.join(', ')} and ${last}`;
}

function formatTeamMembers({ members }) {
    const capitalizedMembers = members.map(m => 
        m.split(/\s+/)
         .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
         .join(' ')
    );

    if (capitalizedMembers.length === 1) {
        return `with ${capitalizedMembers[0]}`;
    }

    const last = capitalizedMembers.pop();
    return `with ${capitalizedMembers.join(', ')} and ${last}`;
}
