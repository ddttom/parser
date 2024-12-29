import { createLogger } from '../../../utils/logger.js';
import { Confidence } from '../utils/confidence.js';
import { validateParserInput } from '../utils/validation.js';

const logger = createLogger('LinksParser');

export const name = 'links';

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Must have valid hostname
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return false;
    }
    // Hostname must be valid
    const hostParts = parsed.hostname.split('.');
    if (!hostParts.every(part => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(part))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isValidMarkdownText(text) {
  // Text must be non-empty, no brackets, and trimmed
  return text && 
         typeof text === 'string' && 
         text.trim() === text && 
         !text.includes('[') && 
         !text.includes(']');
}

function isValidInferredUrl(domain) {
  // Must start with alphanumeric
  if (!/^[a-z0-9]/i.test(domain)) return false;

  // Must end with valid TLD
  if (!/\.(com|org|net|edu|gov|io)$/i.test(domain)) return false;

  // Split into parts
  const parts = domain.split('.');
  
  // Must have at least domain and TLD
  if (parts.length < 2) return false;

  // Each part must be valid
  return parts.every(part => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(part));
}

export async function perfect(text) {
  const validationError = validateParserInput(text, 'LinksParser');
  if (validationError) {
    return validationError;
  }

  try {
    // Try markdown pattern first
    const markdownMatch = text.match(/\[([^\]]*)\](?:\(([^)]*)\))?/i);
    if (markdownMatch) {
      // If it looks like markdown but is invalid, return no corrections
      if (!markdownMatch[2] || !isValidMarkdownText(markdownMatch[1])) {
        return { text, corrections: [] };
      }

      // If URL is invalid, return no corrections
      if (!isValidUrl(markdownMatch[2])) {
        return { text, corrections: [] };
      }

      // Valid markdown link
      const correction = {
        type: 'link',
        original: markdownMatch[0],
        correction: `[${markdownMatch[1]}](${markdownMatch[2]})`,
        position: {
          start: text.indexOf(markdownMatch[0]),
          end: text.indexOf(markdownMatch[0]) + markdownMatch[0].length
        },
        confidence: 'HIGH'
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

    // Try explicit URLs
    const urlMatch = text.match(/\b(https?:\/\/[^\s<>)"']+)\b/i);
    if (urlMatch) {
      const url = urlMatch[1];
      if (isValidUrl(url)) {
        const correction = {
          type: 'link',
          original: urlMatch[0],
          correction: url,
          position: {
            start: text.indexOf(urlMatch[0]),
            end: text.indexOf(urlMatch[0]) + urlMatch[0].length
          },
          confidence: 'HIGH'
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
      return { text, corrections: [] };
    }

    // Try inferred URLs last
    if (!text.includes('[') && !text.includes(']')) {
      // Don't match if it looks like an invalid URL pattern
      if (/https?:|\/\/|:\/|^https?$|^http$/.test(text)) {
        return { text, corrections: [] };
      }

      const inferredMatch = text.match(/\b(?!https?:\/\/)(?!ftp:\/\/)([\w-]+\.(?:com|org|net|edu|gov|io)|(?:[\w-]+\.)+[\w-]+\.(?:com|org|net|edu|gov|io))\b/i);
      if (inferredMatch) {
        const domain = inferredMatch[1];
        if (isValidInferredUrl(domain)) {
          const correction = {
            type: 'link',
            original: inferredMatch[0],
            correction: `https://${domain}`,
            position: {
              start: text.indexOf(inferredMatch[0]),
              end: text.indexOf(inferredMatch[0]) + inferredMatch[0].length
            },
            confidence: 'LOW'
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
      }
    }

    return { text, corrections: [] };
  } catch (error) {
    logger.error('Error in links parser:', error);
    throw error;
  }
}
