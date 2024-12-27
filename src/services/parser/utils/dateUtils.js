import { DEFAULT_CONFIG as CONFIG } from '../../../config/parser.config.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('DateUtils');

/**
 * Normalize and validate date result
 * @private
 */
function normalizeDateResult(date, type, input) {
  if (!(date instanceof Date) || isNaN(date)) {
    logger.error(`Invalid date result for ${type}:`, { input, date });
    return null;
  }
  return date;
}

/**
 * Calculate weekend date
 * @private
 */
function calculateWeekendDate(now, modifier) {
  try {
    logger.debug('Calculating weekend date:', { modifier });
    
    const currentDay = now.getDay();
    const saturday = 6;  // Saturday's index
    
    // Calculate days until next Saturday
    let daysToAdd = (saturday - currentDay + 7) % 7;
    
    // If it's already Saturday or Sunday and no modifier, go to next weekend
    if ((currentDay === saturday || currentDay === 0) && !modifier) {
      daysToAdd += 7;
    }
    
    // For "next weekend", add an additional week
    if (modifier === 'next') {
      daysToAdd += 7;
    }
    
    const result = new Date(now);
    result.setDate(now.getDate() + daysToAdd);
    
    logger.debug('Weekend calculation result:', { 
      currentDay,
      daysToAdd,
      result: result.toISOString() 
    });
    
    return normalizeDateResult(result, 'weekend', { modifier });
  } catch (error) {
    logger.error('Error calculating weekend date:', error);
    return null;
  }
}

/**
 * Calculate weekday date
 */
function calculateWeekdayDate(now, dayName, modifier) {
  try {
    logger.debug('Calculating weekday date:', { dayName, modifier });
    
    // Handle weekend as special case
    if (dayName.toLowerCase() === 'weekend') {
      return calculateWeekendDate(now, modifier);
    }
    
    const targetDay = CONFIG.days.indexOf(dayName.toLowerCase());
    const currentDay = now.getDay();
    
    if (targetDay === -1) {
      logger.error('Invalid day name:', dayName);
      return null;
    }

    let result = new Date(now);
    
    switch (modifier) {
      case 'next':
        // Always move to next week
        let nextDiff = targetDay - currentDay;
        if (nextDiff <= 0) nextDiff += 7;
        nextDiff += 7; // Add another week for "next"
        result.setDate(now.getDate() + nextDiff);
        break;
        
      case 'last': {
        // Go back 7 days first
        result.setDate(now.getDate() - 7);
        // Then step forward until we hit the target day
        while (result.getDay() !== targetDay) {
          result.setDate(result.getDate() + 1);
        }
        break;
      }
        
      default: // 'this' or no modifier
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7;  // If day has passed, go to next week
        result.setDate(now.getDate() + diff);
    }

    logger.debug('Weekday calculation result:', { 
      targetDay,
      currentDay,
      result: result.toISOString(),
      modifier 
    });
    
    return normalizeDateResult(result, 'weekday', { dayName, modifier });
  } catch (error) {
    logger.error('Error calculating weekday date:', error);
    return null;
  }
}

/**
 * Calculate week date
 */
function calculateWeekDate(now, modifier) {
  try {
    const result = new Date(now);
    const daysToAdd = modifier === 'next' ? 7 : -7;
    result.setDate(now.getDate() + daysToAdd);
    return result;
  } catch (error) {
    logger.error('Error calculating week date:', error);
    return null;
  }
}

/**
 * Calculate month date
 */
function calculateMonthDate(now, modifier) {
  try {
    const result = new Date(now);
    switch (modifier) {
      case 'next':
        result.setMonth(now.getMonth() + 1, 1);
        break;
      case 'last':
        result.setMonth(now.getMonth() - 1, 1);
        break;
      case CONFIG.dateModifiers.endOf:
        result.setMonth(now.getMonth() + 1, 0);
        break;
      case CONFIG.dateModifiers.beginningOf:
        result.setDate(1);
        break;
      default:
        return null;
    }
    return result;
  } catch (error) {
    logger.error('Error calculating month date:', error);
    return null;
  }
}

/**
 * Calculate quarter date
 */
function calculateQuarterDate(now, modifier) {
  try {
    const result = new Date(now);
    const currentQuarter = Math.floor(now.getMonth() / 3);
    
    switch (modifier) {
      case 'next':
        result.setMonth((currentQuarter + 1) * 3, 1);
        break;
      case 'last':
        result.setMonth((currentQuarter - 1) * 3, 1);
        break;
      case CONFIG.dateModifiers.endOf:
        result.setMonth(currentQuarter * 3 + 3, 0);
        break;
      case CONFIG.dateModifiers.beginningOf:
        result.setMonth(currentQuarter * 3, 1);
        break;
      default:
        return null;
    }
    return result;
  } catch (error) {
    logger.error('Error calculating quarter date:', error);
    return null;
  }
}

/**
 * Calculate year date
 */
function calculateYearDate(now, modifier) {
  try {
    const result = new Date(now);
    switch (modifier) {
      case 'next':
        result.setFullYear(now.getFullYear() + 1, 0, 1);
        break;
      case 'last':
        result.setFullYear(now.getFullYear() - 1, 0, 1);
        break;
      case CONFIG.dateModifiers.endOf:
        result.setFullYear(now.getFullYear(), 11, 31);
        break;
      case CONFIG.dateModifiers.beginningOf:
        result.setMonth(0, 1);
        break;
      default:
        return null;
    }
    return result;
  } catch (error) {
    logger.error('Error calculating year date:', error);
    return null;
  }
}

/**
 * Find last weekday in month
 */
function findLastWeekdayInMonth(now, targetDay) {
  try {
    logger.debug('Finding last weekday in month:', { targetDay });
    
    // Get the last day of the current month
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    logger.debug('Last day of month:', lastDay.toISOString());
    
    // Start from last day and walk backwards until we find the target day
    const result = new Date(lastDay);
    while (result.getDay() !== targetDay) {
      result.setDate(result.getDate() - 1);
      // If we've gone into the previous month, something went wrong
      if (result.getMonth() !== now.getMonth()) {
        logger.error('Error: Went into previous month while finding last weekday');
        return null;
      }
    }
    
    logger.debug('Found last weekday:', { 
      date: result.toISOString(), 
      day: CONFIG.days[result.getDay()]
    });
    
    return normalizeDateResult(result, 'lastWeekday', { 
      targetDay,
      originalMonth: now.getMonth(),
      resultMonth: result.getMonth()
    });
  } catch (error) {
    logger.error('Error finding last weekday in month:', error);
    return null;
  }
}

/**
 * Find last occurrence
 */
function findLastOccurrence(now, targetDay, timeframe) {
  try {
    logger.debug('Finding last occurrence:', { targetDay, timeframe });
    
    switch (timeframe) {
      case 'month':
        return findLastWeekdayInMonth(now, targetDay);
      case 'quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        logger.debug('Quarter end:', quarterEnd.toISOString());
        
        const result = new Date(quarterEnd);
        while (result.getDay() !== targetDay) {
          result.setDate(result.getDate() - 1);
        }
        return normalizeDateResult(result, 'lastOccurrenceQuarter', { targetDay });
      }
      case 'year': {
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        logger.debug('Year end:', yearEnd.toISOString());
        
        const result = new Date(yearEnd);
        while (result.getDay() !== targetDay) {
          result.setDate(result.getDate() - 1);
        }
        return normalizeDateResult(result, 'lastOccurrenceYear', { targetDay });
      }
      default:
        logger.error('Invalid timeframe:', timeframe);
        return null;
    }
  } catch (error) {
    logger.error('Error finding last occurrence:', error);
    return null;
  }
}

export {
  calculateWeekdayDate,
  calculateWeekDate,
  calculateMonthDate,
  calculateQuarterDate,
  calculateYearDate,
  findLastOccurrence,
  findLastWeekdayInMonth,
  calculateWeekendDate,
};
