import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('PatternUtils');

// Common patterns used across multiple parsers
export const SHARED_PATTERNS = {
    // Date & Time
    time: /\b([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*(?:am|pm)?\b/i,
    date: /\b\d{4}-\d{2}-\d{2}\b/,
    dayOfWeek: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    relativeDay: /\b(today|tomorrow|yesterday)\b/i,
    
    // People & Contact
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    mention: /@([a-zA-Z]\w+)/,
    namePattern: /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/,
    
    // Web & Links
    url: /https?:\/\/[^\s]+/,
    filePath: /file:\/\/[^\s]+/,
    
    // Common Indicators
    priority: /\b(urgent|high|medium|low|normal)\b/i,
    status: /\b(pending|started|complete|blocked)\b/i,
    
    // General Purpose
    hashtag: /#([a-zA-Z]\w+)/,
    duration: /\b(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)\b/i
};

// Pattern validation and match handling
export function validatePatternMatch(match) {
    return Boolean(match && match.length > 0);
}

// Extract time components from various formats
export function extractTimeComponents(timeString) {
    try {
        const match = timeString.match(SHARED_PATTERNS.time);
        if (!match) return null;

        let [hours, minutes] = match[0].split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);

        // Handle AM/PM
        const isPM = /pm/i.test(match[0]);
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        return {
            hours,
            minutes
        };
    } catch (error) {
        logger.error('Error extracting time components:', error);
        return null;
    }
}

// Common confidence scoring factors
export function calculateBaseConfidence(match, text) {
    let confidence = 0.5; // Start with neutral confidence

    try {
        // Pattern quality factors
        if (match.length > 20) confidence += 0.1;
        if (/^[A-Z]/.test(match)) confidence += 0.1;

        // Position factors
        const position = text.indexOf(match);
        const isAtStart = position === 0;
        const isNearStart = position < text.length * 0.2;
        
        if (isAtStart) confidence += 0.2;
        else if (isNearStart) confidence += 0.1;

        return Math.min(1, confidence);
    } catch (error) {
        logger.error('Error calculating base confidence:', error);
        return 0.5; // Return neutral confidence on error
    }
}

// Helper for handling unit conversions
export const TIME_UNITS = {
    minute: 1,
    min: 1,
    hour: 60,
    hr: 60,
    day: 1440
};

// Convert duration strings to minutes
export function convertToMinutes(amount, unit) {
    const unitKey = unit.toLowerCase().replace(/s$/, ''); // Remove trailing 's'
    return amount * (TIME_UNITS[unitKey] || 1);
}
