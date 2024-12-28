import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('ContactParser');

export const name = 'contact';

export async function parse(text) {
  const validationError = validateParserInput(text, 'ContactParser');
  if (validationError) {
    return validationError;
  }

  const patterns = {
    email: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i,
    phone: /(?:^|\s)(\+\d{1,3}-\d{3}-\d{3}-\d{4})\b/i,
    inferred_contact: /\b(?:call|contact|email|meet|with|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i,
    name_reference: /\b(?:contact(?:ing)?|reach(?:ing)?(?:\s+out\s+to)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i
  };

  let bestMatch = null;
  let highestConfidence = Confidence.LOW;

  for (const [pattern, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      let confidence;
      let value;

      switch (pattern) {
        case 'email': {
          const email = match[1];
          // Validate email format
          if (!email.includes('@') || !email.includes('.')) {
            continue;
          }
          confidence = Confidence.HIGH;
          const nameParts = email.split('@')[0].split(/[._]/);
          const name = nameParts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          value = {
            type: 'email',
            value: email,
            name
          };
          break;
        }

        case 'phone': {
          const phone = match[1];
          // Validate phone format
          if (!phone.match(/^\+\d{1,3}-\d{3}-\d{3}-\d{4}$/)) {
            continue;
          }
          confidence = Confidence.HIGH;
          value = {
            type: 'phone',
            value: phone.replace(/-/g, ''),
            formatted: phone
          };
          break;
        }

        case 'name_reference': {
          const name = match[1].trim();
          confidence = Confidence.HIGH;
          value = {
            type: 'reference',
            name,
            id: name.toLowerCase().replace(/\s+/g, '_')
          };
          break;
        }

        case 'inferred_contact': {
          const name = match[1].trim();
          confidence = Confidence.MEDIUM;
          value = {
            type: 'reference',
            name,
            id: name.toLowerCase().replace(/\s+/g, '_')
          };
          break;
        }
      }

      // Update if current confidence is higher or equal priority pattern
      const shouldUpdate = value && (!bestMatch || 
          (confidence === Confidence.HIGH && bestMatch.metadata.confidence !== Confidence.HIGH) ||
          (confidence === Confidence.MEDIUM && bestMatch.metadata.confidence === Confidence.LOW));
      
      if (shouldUpdate) {
        highestConfidence = confidence;
        bestMatch = {
          type: 'contact',
          value,
          metadata: {
            confidence,
            pattern,
            originalMatch: pattern === 'phone' ? match[1] : match[0]
          }
        };
      }
    }
  }

  return bestMatch;
}
