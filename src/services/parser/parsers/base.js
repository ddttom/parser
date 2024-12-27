/**
 * Base Parser Template
 * 
 * This template implements the standard parser structure that all parsers should follow.
 * Key features:
 * - Standardized error handling via exceptions
 * - Consistent confidence scoring (0.0-1.0)
 * - Pattern-based matching with priority
 * - Rich metadata generation
 * - Best match selection
 * - when checking confidence levels do not use >0.95 use >= 0.95
 *  - when checking confidence levels do not use <0.90 use <= 0.90
 */

import { createLogger } from '../../../utils/logger.js';

// Initialize logger at module level
const logger = createLogger('BaseParser');

// Export parser name
export const name = 'base';

/**
 * Main parse function
 * @param {string} text - Input text to parse
 * @returns {Object|Array|null} Parsed result(s) or null if no match
 * @throws {Error} If input is invalid
 */
export async function parse(text) {
    // Input validation
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
    }

    // Define patterns in order of confidence
    const patterns = {
        explicit_pattern: /\[base:([^\]]+)\]/i,     // Highest confidence (0.95)
        standard_pattern: /\b(\w+\s*\w*)\b/i,      // Standard confidence (0.90)
        implicit_pattern: /(.+)/i                   // Lowest confidence (0.80)
    };

    // For single-match parsers
    let bestMatch = null;
    let highestConfidence = 0;

    // For multi-match parsers
    const results = [];

    // Trim input for pattern matching
    const trimmedText = text.trim();
    
    // Pattern matching
    for (const [pattern, regex] of Object.entries(patterns)) {
        // Skip implicit pattern for empty trimmed input
        if (pattern === 'implicit_pattern' && !trimmedText) {
            continue;
        }
        
        const match = trimmedText.match(regex);
        if (match) {
            let confidence;
            let value;

            // Pattern-specific processing
            switch (pattern) {
                case 'explicit_pattern': {
                    confidence = 0.95;
                    value = {
                        // Parser-specific value structure
                        field: match[1].trim()
                    };
                    break;
                }
                case 'standard_pattern': {
                    confidence = 0.90;
                    value = {
                        field: match[1].trim()
                    };
                    break;
                }
                case 'implicit_pattern': {
                    confidence = 0.80;
                    value = {
                        field: match[1].trim()
                    };
                    break;
                }
            }

            // For single-match parsers: track best match
            if (confidence > highestConfidence) {
                highestConfidence = confidence;
                bestMatch = {
                    type: name,
                    value,
                    metadata: {
                        confidence,
                        pattern,
                        originalMatch: match[0]
                    }
                };
            }

            // For multi-match parsers: collect all matches
            results.push({
                type: name,
                value,
                metadata: {
                    confidence,
                    pattern,
                    originalMatch: match[0]
                }
            });
        }
    }

    // Return based on parser type
    // Single match: return bestMatch
    return bestMatch;
    // Multiple matches: return results.length > 0 ? results : null;
}
