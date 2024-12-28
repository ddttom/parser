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

export async function parse(text) {
  const validationError = validateParserInput(text, 'LinksParser');
  if (validationError) {
    return validationError;
  }

  try {
    // Try markdown pattern first
    const markdownMatch = text.match(/\[([^\]]*)\](?:\(([^)]*)\))?/i);
    if (markdownMatch) {
      // If it looks like markdown but is invalid, return null
      if (!markdownMatch[2] || !isValidMarkdownText(markdownMatch[1])) {
        return null;
      }

      // If URL is invalid, return null
      if (!isValidUrl(markdownMatch[2])) {
        return null;
      }

      // Valid markdown link
      return {
        type: name,
        value: {
          url: markdownMatch[2],
          text: markdownMatch[1],
          type: 'markdown'
        },
        metadata: {
          confidence: Confidence.HIGH,
          pattern: 'markdown_link',
          originalMatch: markdownMatch[0]
        }
      };
    }

    // Try explicit URLs
    const urlMatch = text.match(/\b(https?:\/\/[^\s<>)"']+)\b/i);
    if (urlMatch) {
      const url = urlMatch[1];
      if (isValidUrl(url)) {
        return {
          type: name,
          value: {
            url,
            type: 'url'
          },
          metadata: {
            confidence: Confidence.HIGH,
            pattern: 'url',
            originalMatch: urlMatch[0]
          }
        };
      }
      return null;
    }

    // Try inferred URLs last
    if (!text.includes('[') && !text.includes(']')) {
      // Don't match if it looks like an invalid URL pattern
      if (/https?:|\/\/|:\/|^https?$|^http$/.test(text)) {
        return null;
      }

      const inferredMatch = text.match(/\b(?!https?:\/\/)(?!ftp:\/\/)([\w-]+\.(?:com|org|net|edu|gov|io)|(?:[\w-]+\.)+[\w-]+\.(?:com|org|net|edu|gov|io))\b/i);
      if (inferredMatch) {
        const domain = inferredMatch[1];
        if (isValidInferredUrl(domain)) {
          return {
            type: name,
            value: {
              url: `https://${domain}`,
              type: 'url'
            },
            metadata: {
              confidence: Confidence.LOW,
              pattern: 'inferred_url',
              originalMatch: inferredMatch[0]
            }
          };
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('Error in links parser:', error);
    return {
      type: 'error',
      error: 'PARSER_ERROR',
      message: error.message
    };
  }
}
