import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('LocationParser');

export const name = 'location';

const LOCATION_EXPANSIONS = {
    'conf': 'Conference Room',
    'mtg': 'Meeting Room',
    'rm': 'Room',
    'ofc': 'Office',
    'bldg': 'Building',
    'flr': 'Floor',
    'lvl': 'Level',
    'fl': 'Floor',
    'west': 'West Wing',
    'east': 'East Wing',
    'north': 'North Wing',
    'south': 'South Wing'
};

export async function perfect(text) {
    const validationError = validateParserInput(text, 'LocationParser');
    if (validationError) {
        return { text, corrections: [] };
    }

    try {
        // Try location patterns in order of specificity
        const roomMatch = findRoomLocation(text);
        if (roomMatch) {
            const correction = {
                type: 'location_improvement',
                original: roomMatch.match,
                correction: formatRoomLocation(roomMatch),
                position: {
                    start: text.indexOf(roomMatch.match),
                    end: text.indexOf(roomMatch.match) + roomMatch.match.length
                },
                confidence: roomMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try office location
        const officeMatch = findOfficeLocation(text);
        if (officeMatch) {
            const correction = {
                type: 'location_improvement',
                original: officeMatch.match,
                correction: formatOfficeLocation(officeMatch),
                position: {
                    start: text.indexOf(officeMatch.match),
                    end: text.indexOf(officeMatch.match) + officeMatch.match.length
                },
                confidence: officeMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try building location
        const buildingMatch = findBuildingLocation(text);
        if (buildingMatch) {
            const correction = {
                type: 'location_improvement',
                original: buildingMatch.match,
                correction: formatBuildingLocation(buildingMatch),
                position: {
                    start: text.indexOf(buildingMatch.match),
                    end: text.indexOf(buildingMatch.match) + buildingMatch.match.length
                },
                confidence: buildingMatch.confidence
            };

            const before = text.substring(0, correction.position.start);
            const after = text.substring(correction.position.end);
            const perfectedText = before + correction.correction + after;

            return {
                text: perfectedText,
                corrections: [correction]
            };
        }

        // Try inferred location
        const inferredMatch = findInferredLocation(text);
        if (inferredMatch) {
            const correction = {
                type: 'location_improvement',
                original: inferredMatch.match,
                correction: formatInferredLocation(inferredMatch),
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
        logger.error('Error in location parser:', error);
        return { text, corrections: [] };
    }
}

function findRoomLocation(text) {
    const pattern = /(?:(?:in|at)\s+(?:the\s+)?)?(?:(?:room|conf(?:erence)?(?:\s+room)?|mtg(?:\s+room)?|rm)\s+)([A-Za-z0-9-]+)(?:\s*(?:(?:floor|flr|level|lvl)\s+)?(\d+))?\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const roomNumber = match[1].trim();
    if (!roomNumber) return null;

    return {
        match: match[0],
        roomNumber,
        floor: match[2],
        confidence: Confidence.HIGH
    };
}

function findOfficeLocation(text) {
    const pattern = /(?:(?:in|at)\s+(?:the\s+)?)?(?:(?:office|ofc)\s+)([A-Za-z0-9-]+)(?:\s*(?:(?:floor|flr|level|lvl)\s+)?(\d+))?\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const officeNumber = match[1].trim();
    if (!officeNumber) return null;

    return {
        match: match[0],
        officeNumber,
        floor: match[2],
        confidence: Confidence.HIGH
    };
}

function findBuildingLocation(text) {
    const pattern = /(?:(?:in|at)\s+(?:the\s+)?)?(?:(?:building|bldg)\s+)([A-Za-z0-9-]+)(?:\s*(?:(?:floor|flr|level|lvl)\s+)?(\d+))?\b/i;
    const match = text.match(pattern);
    if (!match) return null;

    const buildingId = match[1].trim();
    if (!buildingId) return null;

    return {
        match: match[0],
        buildingId,
        floor: match[2],
        confidence: Confidence.HIGH
    };
}

function findInferredLocation(text) {
    const pattern = /\b(?:in|at)\s+(?:the\s+)?([^,.]+?)(?:\s*(?:(?:floor|flr|level|lvl)\s+)?(\d+))?\b(?:[,.]|\s|$)/i;
    const match = text.match(pattern);
    if (!match) return null;

    const location = match[1].trim();
    if (!location) return null;

    return {
        match: match[0],
        location,
        floor: match[2],
        confidence: Confidence.LOW
    };
}

function formatRoomLocation({ roomNumber, floor }) {
    let formatted = `Conference Room ${roomNumber}`;
    if (floor) {
        formatted += `, Floor ${floor}`;
    }
    return formatted;
}

function formatOfficeLocation({ officeNumber, floor }) {
    let formatted = `Office ${officeNumber}`;
    if (floor) {
        formatted += `, Floor ${floor}`;
    }
    return formatted;
}

function formatBuildingLocation({ buildingId, floor }) {
    let formatted = `Building ${buildingId}`;
    if (floor) {
        formatted += `, Floor ${floor}`;
    }
    return formatted;
}

function formatInferredLocation({ location, floor }) {
    // Try to expand any abbreviations
    let formatted = location;
    for (const [abbr, full] of Object.entries(LOCATION_EXPANSIONS)) {
        const regex = new RegExp(`\\b${abbr}\\b`, 'i');
        formatted = formatted.replace(regex, full);
    }

    // Capitalize first letter of each word
    formatted = formatted.split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    if (floor) {
        formatted += `, Floor ${floor}`;
    }
    return formatted;
}
