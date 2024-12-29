import { createLogger } from '../../../utils/logger.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('AttendeesParser');

export const name = 'attendees';

export async function perfect(text) {
    const validationError = validateParserInput(text, 'AttendeesParser');
    if (validationError) {
        return validationError;
    }

    const patterns = {
        role_mentions: /@(\w+)\s*\(([^)]+)\)(?:\s*(?:and|&|\s*,\s*)\s*@(\w+)\s*\(([^)]+)\))*/gi,
        explicit_mentions: /@(\w+)(?:\s*,\s*@(\w+))*(?:\s*(?:and|&)\s*@(\w+))*/i,
        attendee_list: /(?:attendees?|participants?|people)(?:\s*:\s*|\s+)((?:[A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)*(?:\s*(?:and|&)\s*[A-Z][a-z]+)?))/i,
        implicit_attendees: /(?:with|and)\s+([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)*(?:\s*(?:and|&)\s*[A-Z][a-z]+)?)/i,
        joining: /(?:joining|attending)(?:\s*:\s*|\s+)((?:[A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)*(?:\s*(?:and|&)\s*[A-Z][a-z]+)?))/i
    };

    let bestMatch = null;
    let highestConfidence = 0;

    for (const [pattern, regex] of Object.entries(patterns)) {
        const match = text.match(regex);
        if (match) {
            let confidence;
            let value;

            switch (pattern) {
                case 'role_mentions': {
                    confidence = 0.95;
                    const attendees = [];
                    let m;
                    const rolePattern = /@(\w+)\s*\(([^)]+)\)/g;
                    while ((m = rolePattern.exec(match[0])) !== null) {
                        attendees.push({
                            name: m[1],
                            role: m[2].trim()
                        });
                    }
                    value = {
                        attendees,
                        count: attendees.length
                    };
                    break;
                }

                case 'explicit_mentions': {
                    confidence = 0.9;
                    const mentions = match[0].match(/@\w+/g) || [];
                    const attendees = mentions.map(m => m.substring(1));
                    value = {
                        attendees,
                        count: attendees.length
                    };
                    break;
                }

                case 'attendee_list': {
                    confidence = 0.9;
                    const attendees = match[1]
                        .split(/\s*(?:,|and|&)\s*/)
                        .map(name => name.trim())
                        .filter(Boolean);
                    value = {
                        attendees,
                        count: attendees.length
                    };
                    break;
                }

                case 'joining': {
                    confidence = 0.85;
                    const attendees = match[1]
                        .split(/\s*(?:,|and|&)\s*/)
                        .map(name => name.trim())
                        .filter(Boolean);
                    value = {
                        attendees,
                        count: attendees.length
                    };
                    break;
                }

                case 'implicit_attendees': {
                    confidence = 0.75;
                    const attendees = match[1]
                        .split(/\s*(?:,|and|&)\s*/)
                        .map(name => name.trim())
                        .filter(Boolean);
                    value = {
                        attendees,
                        count: attendees.length
                    };
                    break;
                }
            }

            if (confidence > highestConfidence) {
                highestConfidence = confidence;
                bestMatch = {
                    attendees: {
                        ...value,
                        confidence,
                        pattern,
                        originalMatch: match[0]
                    }
                };
            }
        }
    }

    if (!bestMatch) {
        return {
            text,
            corrections: []
        };
    }

    const { attendees } = bestMatch;
    const correction = {
        type: 'attendees',
        original: attendees.originalMatch,
        correction: formatAttendees(attendees.attendees),
        position: {
            start: text.indexOf(attendees.originalMatch),
            end: text.indexOf(attendees.originalMatch) + attendees.originalMatch.length
        },
        confidence: attendees.confidence >= 0.9 ? 'HIGH' : attendees.confidence >= 0.8 ? 'MEDIUM' : 'LOW'
    };

    // Apply correction
    const before = text.substring(0, correction.position.start);
    const after = text.substring(correction.position.end);
    const perfectedText = before + correction.correction + after;

    return {
        text: perfectedText,
        corrections: [correction]
    };
}

function formatAttendees(attendeesList) {
    if (Array.isArray(attendeesList)) {
        // Handle array of strings
        if (typeof attendeesList[0] === 'string') {
            return attendeesList.length === 1 
                ? attendeesList[0]
                : attendeesList.length === 2 
                    ? `${attendeesList[0]} and ${attendeesList[1]}`
                    : attendeesList.slice(0, -1).join(', ') + ', and ' + attendeesList[attendeesList.length - 1];
        }
        // Handle array of objects with name and role
        return attendeesList.map(a => `${a.name} (${a.role})`).join(', ');
    }
    return '';
}
