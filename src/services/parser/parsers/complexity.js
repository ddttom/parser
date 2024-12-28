import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ComplexityParser');

export const name = 'complexity';

export async function parse(text) {
    const validationError = validateParserInput(text, 'ComplexityParser');
    if (validationError) {
        return validationError;
    }

    const patterns = {
        numeric_complexity: /\[complexity:(\d+)\]/i,
        explicit_complexity: /\[complexity:(high|medium|low)\]/i,
        keyword_complexity: /\b(complex|complicated|simple|easy|difficult|hard|challenging)\b/i
    };

    let bestMatch = null;
    let highestConfidence = Confidence.LOW;

    const complexityLevels = {
        high: 3,
        medium: 2,
        low: 1
    };

    const keywordMap = {
        complex: 'high',
        complicated: 'high',
        difficult: 'high',
        hard: 'high',
        challenging: 'high',
        simple: 'low',
        easy: 'low'
    };

    for (const [pattern, regex] of Object.entries(patterns)) {
        const match = text.match(regex);
        if (match) {
            let confidence;
            let value;

            switch (pattern) {
                case 'numeric_complexity': {
                    const score = parseInt(match[1], 10);
                    // Validate numeric value
                    if (score < 1 || score > 3) {
                        continue;
                    }
                    confidence = Confidence.HIGH;
                    value = {
                        level: score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low',
                        score
                    };
                    break;
                }

                case 'explicit_complexity': {
                    confidence = Confidence.HIGH;
                    const level = match[1].toLowerCase();
                    value = {
                        level,
                        score: complexityLevels[level]
                    };
                    break;
                }

                case 'keyword_complexity': {
                    confidence = Confidence.MEDIUM;
                    const level = keywordMap[match[1].toLowerCase()];
                    value = {
                        level,
                        score: complexityLevels[level]
                    };
                    break;
                }
            }

            // Update if current confidence is higher or equal priority pattern
            const shouldUpdate = !bestMatch || 
                (confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
                (confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW);
            
            if (shouldUpdate) {
                highestConfidence = confidence;
                bestMatch = {
                    type: 'complexity',
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
