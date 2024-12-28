import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('TeamParser');

export const name = 'team';

const VALID_TEAMS = new Set([
    'frontend',
    'backend',
    'design',
    'qa',
    'devops',
    'mobile',
    'infrastructure',
    'security',
    'data',
    'platform'
]);

export function validateTeam(team) {
    if (!team || typeof team !== 'string') return false;
    return VALID_TEAMS.has(team.toLowerCase());
}

export async function parse(text) {
    const validationError = validateParserInput(text, 'TeamParser');
    if (validationError) {
        return validationError;
    }

    try {
        // Check for @mentions
        const mentionPattern = /@([a-z0-9_-]+)/gi;
        const mentions = [...text.matchAll(mentionPattern)].map(m => m[1]);
        if (mentions.length > 0) {
            return {
                team: {
                    members: mentions,
                    pattern: 'mentions',
                    confidence: Confidence.HIGH,
                    originalMatch: mentions.map(m => `@${m}`).join(', ')
                }
            };
        }

        // Check for name lists
        const nameListPattern = /involving\s+([a-z]+(?:\s*,\s*[a-z]+)*(?:\s+and\s+[a-z]+)?)/i;
        const nameMatch = text.match(nameListPattern);
        if (nameMatch) {
            const names = nameMatch[1]
                .split(/\s*,\s*|\s+and\s+/)
                .map(name => name.trim().toLowerCase())
                .filter(name => name.length > 0);

            if (names.length > 0) {
                return {
                    team: {
                        members: names,
                        pattern: 'name_list',
                        confidence: Confidence.MEDIUM,
                        originalMatch: nameMatch[0]
                    }
                };
            }
        }

        // Check for inferred team references
        const inferredMatch = text.match(/\b([a-z0-9_-]+)\s+team\b/i);
        if (inferredMatch) {
            const team = inferredMatch[1];
            // Call validateTeam directly to allow error propagation
            const isValid = parse.validateTeam(team);
            if (!isValid) return null;

            return {
                team: {
                    name: team.toLowerCase(),
                    pattern: 'inferred',
                    confidence: Confidence.MEDIUM,
                    originalMatch: inferredMatch[0]
                }
            };
        }

        return null;
    } catch (error) {
        logger.error('Error in team parser:', error);
        return {
            team: {
                error: 'PARSER_ERROR',
                message: error.message
            }
        };
    }
}

// Make validateTeam available for mocking in tests
parse.validateTeam = validateTeam;
