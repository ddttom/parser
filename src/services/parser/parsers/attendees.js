import { createLogger } from '../../../utils/logger.js';
const logger = createLogger('AttendeesParser');

export const name = 'attendees';

export async function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'error',
            error: 'INVALID_INPUT',
            message: 'Input must be a non-empty string'
        };
    }

    const patterns = {
        explicit_list: /\[attendees:([^\]]+)\]/i,
        role_mentions: /@(\w+)\s*\(([^)]+)\)(?:\s*(?:and|&|\s*,\s*)\s*@(\w+)\s*\(([^)]+)\))*/gi,
        explicit_mentions: /@(\w+)(?:\s*,\s*@(\w+))*(?:\s*(?:and|&)\s*@(\w+))*/i,
        implicit_attendees: /(?:with|and)\s+([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)*(?:\s*(?:and|&)\s*[A-Z][a-z]+)?)/i
    };

    let bestMatch = null;
    let highestConfidence = 0;

    for (const [pattern, regex] of Object.entries(patterns)) {
        const match = text.match(regex);
        if (match) {
            let confidence;
            let value;

            switch (pattern) {
                case 'explicit_list': {
                    confidence = 0.95;
                    const attendees = match[1]
                        .split(/\s*,\s*/)
                        .map(name => name.trim())
                        .filter(Boolean);
                    value = {
                        attendees,
                        count: attendees.length
                    };
                    break;
                }

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
                    type: 'attendees',
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
}
