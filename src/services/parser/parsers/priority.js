import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('PriorityParser');

export const name = 'priority';

const PRIORITY_LEVELS = {
  critical: 5,
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0
};

const PRIORITY_ALIASES = {
  highest: 'critical',
  important: 'high',
  normal: 'medium',
  minor: 'low',
  asap: 'urgent'
};

function normalizePriority(priority) {
  priority = priority.toLowerCase();
  return PRIORITY_ALIASES[priority] || priority;
}

function validatePriority(priority) {
  const normalized = normalizePriority(priority);
  return normalized in PRIORITY_LEVELS || priority.toLowerCase() in PRIORITY_ALIASES;
}

function getPriorityScore(priority) {
  const normalized = normalizePriority(priority);
  return PRIORITY_LEVELS[normalized] || 0;
}

function getAllPriorityTerms() {
  return [...Object.keys(PRIORITY_LEVELS), ...Object.keys(PRIORITY_ALIASES)];
}

export async function parse(text) {
  if (!text || typeof text !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  const indicators = [];
  const matches = [];
  const matchedRanges = new Set();

  function isOverlapping(start, end) {
    for (const range of matchedRanges) {
      if (start <= range.end && end >= range.start) {
        return true;
      }
    }
    return false;
  }

  // Explicit priority marker [priority:level]
  const explicitMatch = text.match(/\[priority:(\w+)\]/i);
  if (explicitMatch) {
    const priority = explicitMatch[1];
    if (validatePriority(priority)) {
      const normalized = normalizePriority(priority);
      indicators.push({
        level: normalized,
        confidence: 0.95,
        pattern: 'explicit_priority',
        match: explicitMatch[0],
        index: explicitMatch.index
      });
      matches.push({
        0: explicitMatch[0],
        1: priority,
        index: explicitMatch.index
      });
      matchedRanges.add({
        start: explicitMatch.index,
        end: explicitMatch.index + explicitMatch[0].length
      });
    }
  }

  // Priority hashtags #urgent, #high-priority, etc.
  const priorityTerms = getAllPriorityTerms().join('|');
  const hashtagPattern = new RegExp(`#(${priorityTerms})(?:-priority)?\\b`, 'i');
  const hashtagMatch = text.match(hashtagPattern);
  if (hashtagMatch && !isOverlapping(hashtagMatch.index, hashtagMatch.index + hashtagMatch[0].length)) {
    const priority = hashtagMatch[1];
    if (validatePriority(priority)) {
      const normalized = normalizePriority(priority);
      indicators.push({
        level: normalized,
        confidence: 0.9,
        pattern: 'hashtag',
        match: hashtagMatch[0],
        index: hashtagMatch.index
      });
      matches.push({
        0: hashtagMatch[0],
        1: priority,
        index: hashtagMatch.index
      });
      matchedRanges.add({
        start: hashtagMatch.index,
        end: hashtagMatch.index + hashtagMatch[0].length
      });
    }
  }

  // Priority keywords "high priority", "urgent task", etc.
  const keywordPattern = new RegExp(`\\b(${priorityTerms})\\s+priority\\b\\s+task`, 'i');
  const keywordMatch = text.match(keywordPattern);
  if (keywordMatch && !isOverlapping(keywordMatch.index, keywordMatch.index + keywordMatch[0].length)) {
    const priority = keywordMatch[1];
    if (validatePriority(priority)) {
      const normalized = normalizePriority(priority);
      const matchText = text.slice(keywordMatch.index, keywordMatch.index + keywordMatch[1].length + 9);
      indicators.push({
        level: normalized,
        confidence: 0.85,
        pattern: 'keyword',
        match: matchText.toLowerCase(),
        index: keywordMatch.index
      });
      matches.push({
        0: matchText,
        1: priority,
        index: keywordMatch.index
      });
      matchedRanges.add({
        start: keywordMatch.index,
        end: keywordMatch.index + keywordMatch[0].length
      });
    }
  }

  // Implicit priority patterns
  const implicitPattern = new RegExp(`\\b(${priorityTerms})\\s+priority\\b(?!\\s+task)`, 'i');
  const implicitMatch = text.match(implicitPattern);
  if (implicitMatch && !isOverlapping(implicitMatch.index, implicitMatch.index + implicitMatch[0].length)) {
    const priority = implicitMatch[1];
    if (validatePriority(priority)) {
      const normalized = normalizePriority(priority);
      const matchText = text.slice(implicitMatch.index, implicitMatch.index + implicitMatch[0].length);
      indicators.push({
        level: normalized,
        confidence: 0.75,
        pattern: 'implicit',
        match: matchText,
        index: implicitMatch.index
      });
      matches.push({
        0: matchText,
        1: priority,
        index: implicitMatch.index
      });
      matchedRanges.add({
        start: implicitMatch.index,
        end: implicitMatch.index + implicitMatch[0].length
      });
    }
  }

  // Return null if no valid indicators found
  if (indicators.length === 0) {
    return null;
  }

  // Sort indicators by priority level first, then confidence
  indicators.sort((a, b) => {
    const scoreA = getPriorityScore(a.level);
    const scoreB = getPriorityScore(b.level);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.confidence - a.confidence;
  });

  const bestIndicator = indicators[0];

  // For multiple indicators, return combined result
  if (indicators.length > 1) {
    // Sort matches by position in text to maintain original order
    matches.sort((a, b) => a.index - b.index);
    
    return {
      type: 'priority',
      value: {
        level: bestIndicator.level,
        score: getPriorityScore(bestIndicator.level),
        indicators: matches.map(m => normalizePriority(m[1]))
      },
      metadata: {
        confidence: 0.95,
        pattern: 'multiple_indicators',
        originalMatch: matches.map(m => m[0]).join(' ')
      }
    };
  }

  // For single indicator, return direct result
  return {
    type: 'priority',
    value: {
      level: bestIndicator.level,
      score: getPriorityScore(bestIndicator.level)
    },
    metadata: {
      confidence: bestIndicator.confidence,
      pattern: bestIndicator.pattern,
      originalMatch: bestIndicator.match
    }
  };
}
