import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ProjectParser');

export const name = 'project';

const IGNORED_TERMS = new Set([
    'the', 'this', 'new', 'project',
    'tomorrow', 'today', 'yesterday',
    'morning', 'afternoon', 'evening',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

const PROJECT_INDICATORS = {
    project_term: ['project', 'initiative', 'program'],
    task_organization: ['under', 'for', 'in', 'story'],
    stakeholder: ['client', 'team', 'department'],
    timeline: ['roadmap', 'milestone', 'sprint']
};

const PROJECT_EXPANSIONS = {
    'prj': 'Project',
    'proj': 'Project',
    'init': 'Initiative',
    'prog': 'Program',
    'api': 'API',
    'ui': 'UI',
    'ux': 'UX',
    'fe': 'Frontend',
    'be': 'Backend',
    'auth': 'Authentication',
    'admin': 'Administration',
    'app': 'Application',
    'dev': 'Development',
    'prod': 'Production',
    'qa': 'Quality Assurance',
    'ml': 'Machine Learning',
    'ai': 'AI',
    'db': 'Database',
    'docs': 'Documentation',
    'infra': 'Infrastructure',
    'sec': 'Security',
    'sys': 'System'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'ProjectParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try project reference patterns in order of specificity
        const referenceMatch = findProjectReference(text);
        if (referenceMatch) {
            const correction = {
                type: 'project_reference_improvement',
                original: referenceMatch.match,
                correction: formatProjectReference(referenceMatch),
                position: {
                    start: text.indexOf(referenceMatch.match),
                    end: text.indexOf(referenceMatch.match) + referenceMatch.match.length
                },
                confidence: referenceMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try project identifier
        const identifierMatch = findProjectIdentifier(text);
        if (identifierMatch) {
            const correction = {
                type: 'project_identifier_improvement',
                original: identifierMatch.match,
                correction: formatProjectIdentifier(identifierMatch),
                position: {
                    start: text.indexOf(identifierMatch.match),
                    end: text.indexOf(identifierMatch.match) + identifierMatch.match.length
                },
                confidence: identifierMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try inferred project
        const inferredMatch = findInferredProject(text);
        if (inferredMatch) {
            const correction = {
                type: 'project_improvement',
                original: inferredMatch.match,
                correction: formatInferredProject(inferredMatch),
                position: {
                    start: text.indexOf(inferredMatch.match),
                    end: text.indexOf(inferredMatch.match) + inferredMatch.match.length
                },
                confidence: inferredMatch.confidence
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
        logger.error('Error in project parser:', error);
        return { text, corrections: [] };
    }
}

function findProjectReference(text) {
    const pattern = /\b(?:re:\s*|regarding\s+|for\s+|in\s+|under\s+)(?:project\s+)?([A-Za-z][A-Za-z0-9_-]+)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const projectName = match[1];
    if (!validateProjectName(projectName)) return null;

    return {
        match: match[0],
        projectName,
        confidence: Confidence.HIGH
    };
}

function findProjectIdentifier(text) {
    const pattern = /\b(?:PRJ|PROJ)-(\d+)\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    return {
        match: match[0],
        identifier: match[1],
        confidence: Confidence.HIGH
    };
}

function findInferredProject(text) {
    const pattern = /\b([A-Za-z][A-Za-z0-9_-]+)(?:\s+(?:project|initiative|program))?\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const projectName = match[1];
    if (!validateProjectName(projectName)) return null;

    return {
        match: match[0],
        projectName,
        confidence: match[0].toLowerCase().includes('project') ? 
            Confidence.MEDIUM : Confidence.LOW
    };
}

function formatProjectReference({ projectName }) {
    // Expand any abbreviations in project name
    const parts = projectName.split(/[-_\s]+/);
    const expanded = parts.map(part => {
        const lower = part.toLowerCase();
        return PROJECT_EXPANSIONS[lower] || 
               (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    });

    return `Project ${expanded.join(' ')}`;
}

function formatProjectIdentifier({ identifier }) {
    return `Project PRJ-${identifier}`;
}

function formatInferredProject({ projectName, match }) {
    // Expand any abbreviations in project name
    const parts = projectName.split(/[-_\s]+/);
    const expanded = parts.map(part => {
        const lower = part.toLowerCase();
        return PROJECT_EXPANSIONS[lower] || 
               (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    });

    // If original didn't include "project", add it
    if (!match.toLowerCase().includes('project')) {
        return `Project ${expanded.join(' ')}`;
    }

    return expanded.join(' ');
}

function validateProjectName(name) {
    if (!name || typeof name !== 'string') return false;
    
    // Length validation
    if (name.length <= 1 || name.length > 50) return false;
    
    // Must start with a letter
    if (!/^[a-zA-Z]/.test(name)) return false;

    // Allow alphanumeric with spaces, hyphens, underscores
    if (!/^[a-zA-Z][a-zA-Z0-9_\s-]*[a-zA-Z0-9]$/.test(name)) return false;
    
    // Ignore common terms and monetary values
    if (IGNORED_TERMS.has(name.toLowerCase()) || 
        /^\d+k?$/i.test(name) || 
        name.toLowerCase().includes('cost')) return false;
    
    return true;
}
