import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('MilestoneParser');

export const name = 'milestone';

const MILESTONE_EXPANSIONS = {
    'rel': 'Release',
    'v': 'Version',
    'ver': 'Version',
    'beta': 'Beta Release',
    'alpha': 'Alpha Release',
    'rc': 'Release Candidate',
    'ga': 'General Availability',
    'mvp': 'MVP Release',
    'poc': 'Proof of Concept',
    'dev': 'Development',
    'qa': 'Quality Assurance',
    'uat': 'User Acceptance',
    'prod': 'Production',
    'deploy': 'Deployment',
    'impl': 'Implementation',
    'int': 'Integration',
    'sys': 'System',
    'arch': 'Architecture',
    'doc': 'Documentation',
    'test': 'Testing',
    'review': 'Review'
};

const MILESTONE_TYPES = {
    release: ['release', 'launch', 'deployment', 'rollout'],
    review: ['review', 'assessment', 'evaluation'],
    delivery: ['delivery', 'handoff', 'handover'],
    completion: ['completion', 'finished', 'done', 'complete']
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'MilestoneParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try labeled milestone patterns first
        const labeledMatch = findLabeledMilestone(text);
        if (labeledMatch) {
            const correction = {
                type: 'milestone_improvement',
                original: labeledMatch.match,
                correction: formatLabeledMilestone(labeledMatch),
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

        // Try delivery milestone
        const deliveryMatch = findDeliveryMilestone(text);
        if (deliveryMatch) {
            const correction = {
                type: 'milestone_delivery_improvement',
                original: deliveryMatch.match,
                correction: formatDeliveryMilestone(deliveryMatch),
                position: {
                    start: text.indexOf(deliveryMatch.match),
                    end: text.indexOf(deliveryMatch.match) + deliveryMatch.match.length
                },
                confidence: deliveryMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try phase milestone
        const phaseMatch = findPhaseMilestone(text);
        if (phaseMatch) {
            const correction = {
                type: 'milestone_phase_improvement',
                original: phaseMatch.match,
                correction: formatPhaseMilestone(phaseMatch),
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

        return { text, corrections: [] };

    } catch (error) {
        logger.error('Error in milestone parser:', error);
        return { text, corrections: [] };
    }
}

function findLabeledMilestone(text) {
    const pattern = /\b(?:milestone|target):\s*([^,\n]+)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const milestone = match[1].trim();
    if (!validateMilestone(milestone)) return null;

    return {
        match: match[0],
        milestone,
        type: inferMilestoneType(milestone),
        confidence: Confidence.HIGH
    };
}

function findDeliveryMilestone(text) {
    const pattern = /(?:key\s+)?delivery:\s*([^,\n]+)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const milestone = match[1].trim();
    if (!validateMilestone(milestone)) return null;

    return {
        match: match[0],
        milestone,
        confidence: Confidence.HIGH
    };
}

function findPhaseMilestone(text) {
    const pattern = /phase\s+completion:\s*([^,\n]+)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const milestone = match[1].trim();
    if (!validateMilestone(milestone)) return null;

    return {
        match: match[0],
        milestone,
        confidence: Confidence.MEDIUM
    };
}

function formatLabeledMilestone({ milestone, type }) {
    // Expand any abbreviations in milestone text
    const parts = milestone.split(/[-_\s]+/);
    const expanded = parts.map(part => {
        const lower = part.toLowerCase();
        return MILESTONE_EXPANSIONS[lower] || 
               (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    });

    // Add type-specific prefix if not already present
    const text = expanded.join(' ');
    if (type === 'release' && !text.toLowerCase().includes('release')) {
        return `Release: ${text}`;
    }
    if (type === 'review' && !text.toLowerCase().includes('review')) {
        return `Review: ${text}`;
    }
    return `Milestone: ${text}`;
}

function formatDeliveryMilestone({ milestone }) {
    // Expand any abbreviations in milestone text
    const parts = milestone.split(/[-_\s]+/);
    const expanded = parts.map(part => {
        const lower = part.toLowerCase();
        return MILESTONE_EXPANSIONS[lower] || 
               (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    });

    return `Delivery: ${expanded.join(' ')}`;
}

function formatPhaseMilestone({ milestone }) {
    // Expand any abbreviations in milestone text
    const parts = milestone.split(/[-_\s]+/);
    const expanded = parts.map(part => {
        const lower = part.toLowerCase();
        return MILESTONE_EXPANSIONS[lower] || 
               (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    });

    return `Phase Completion: ${expanded.join(' ')}`;
}

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
