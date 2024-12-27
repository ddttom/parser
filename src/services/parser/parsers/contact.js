import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('ContactParser');

export const name = 'contact';

export async function parse(text) {
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  const patterns = {
    email: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i,
    contact_reference: /\[contact:([^\]]+)\]/i,
    phone: /(?:^|\s)(\+\d{1,3}-\d{3}-\d{3}-\d{4})\b/i,
    inferred_contact: /\b(?:call|contact|email|meet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i
  };

  let bestMatch = null;
  let highestConfidence = 0;

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
          confidence = 0.95;
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

        case 'contact_reference': {
          const name = match[1].trim();
          // Validate reference format
          if (!name) {
            continue;
          }
          confidence = 0.95;
          value = {
            type: 'reference',
            name,
            id: name.toLowerCase().replace(/\s+/g, '_')
          };
          break;
        }

        case 'phone': {
          const phone = match[1];
          // Validate phone format
          if (!phone.match(/^\+\d{1,3}-\d{3}-\d{3}-\d{4}$/)) {
            continue;
          }
          confidence = 0.9;
          value = {
            type: 'phone',
            value: phone.replace(/-/g, ''),
            formatted: phone
          };
          break;
        }

        case 'inferred_contact': {
          const name = match[1].trim();
          confidence = 0.75;
          value = {
            type: 'reference',
            name,
            id: name.toLowerCase().replace(/\s+/g, '_')
          };
          break;
        }
      }

      if (confidence > highestConfidence && value) {
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
