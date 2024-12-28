import { createLogger } from '../../../utils/logger.js';

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

function isValidFilePath(path) {
  if (!path || typeof path !== 'string') return false;
  
  const trimmedPath = path.trim();
  if (!trimmedPath) return false;

  // Check for invalid characters in entire path
  if (/[<>"|?*]/.test(trimmedPath)) return false;

  // Handle Windows paths (C:\path\to\file)
  if (/^[A-Za-z]:[/\\]/.test(trimmedPath)) {
    const segments = trimmedPath.slice(3).split(/[/\\]/);
    return isValidPathSegments(segments);
  }

  // Handle Unix absolute paths (/path/to/file)
  if (trimmedPath.startsWith('/')) {
    const segments = trimmedPath.slice(1).split(/[/\\]/);
    return isValidPathSegments(segments);
  }

  // Handle relative paths (./path or ../path)
  if (trimmedPath.startsWith('./') || trimmedPath.startsWith('../')) {
    const segments = trimmedPath.split(/[/\\]/);
    return isValidPathSegments(segments.slice(1));
  }

  // Handle simple paths (path/to/file)
  const segments = trimmedPath.split(/[/\\]/);
  return isValidPathSegments(segments);
}

function isValidPathSegments(segments) {
  if (!segments.length) return false;

  // Check for reserved names (Windows)
  const reservedNames = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
  
  return segments.every(segment => {
    // Allow empty segments for consecutive slashes
    if (!segment) return true;
    
    // Check for reserved names
    if (reservedNames.test(segment)) return false;
    
    // Must contain at least one valid character
    if (!/[a-z0-9._-]/i.test(segment)) return false;
    
    return true;
  });
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
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  try {
    // Try file links first to avoid URL pattern conflicts
    const fileMatch = text.match(/\[file:([^\]]+)\]/i);
    if (fileMatch) {
      const path = fileMatch[1].trim();
      if (isValidFilePath(path)) {
        return {
          type: name,
          value: {
            path,
            type: 'file'
          },
          metadata: {
            confidence: 0.9,
            pattern: 'file_link',
            originalMatch: fileMatch[0]
          }
        };
      }
      return null;
    }

    // Try markdown pattern next
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
          confidence: 0.95,
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
            confidence: 0.95,
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
              confidence: 0.75,
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
