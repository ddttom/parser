const { createLogger } = require('../../../utils/logger');

const logger = createLogger('TimeUtils');

/**
 * Convert time units to minutes
 * @param {number} value - Time value
 * @param {string} unit - Time unit
 * @returns {number} Minutes
 */
function convertToMinutes(value, unit) {
  try {
    const conversions = {
      min: 1,
      minute: 1,
      minutes: 1,
      hour: 60,
      hours: 60,
      day: 1440,
      days: 1440,
    };
    return value * (conversions[unit.toLowerCase()] || 1);
  } catch (error) {
    logger.error('Error converting to minutes:', error);
    return value;
  }
}

/**
 * Format time to 24-hour string
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @returns {string} Formatted time
 */
function formatTime(hour, minute) {
  try {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  } catch (error) {
    logger.error('Error formatting time:', error);
    return '00:00';
  }
}

/**
 * Validate time
 * @param {Object} time - Time object with hour and minute
 * @returns {boolean} Is valid time
 */
function validateTime(time) {
  try {
    const { hour, minute } = time;
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  } catch (error) {
    logger.error('Error validating time:', error);
    return false;
  }
}

module.exports = {
  convertToMinutes,
  formatTime,
  validateTime,
}; 