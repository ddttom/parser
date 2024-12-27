/**
 * Date utility functions for the parser
 */
class DateUtils {
  /**
   * Validates a date object
   * @param {Date} date - Date to validate
   * @returns {Date|null} - Returns the date if valid, null if invalid
   */
  static validateDate(date) {
    try {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (error) {
      console.error('Error validating date:', error);
      return null;
    }
  }

  /**
   * Combines date with time of day
   * @param {Date} date - Base date
   * @param {Object} timeOfDay - Time of day object
   * @returns {Date} Combined date and time
   */
  static combineDateTime(date, timeOfDay) {
    try {
      if (!date || !timeOfDay) return date;

      const result = new Date(date);
      
      if (timeOfDay.hour !== undefined) {
        result.setHours(timeOfDay.hour, timeOfDay.minute || 0, 0, 0);
      } else if (timeOfDay.start) {
        result.setHours(timeOfDay.start, 0, 0, 0);
      }

      return this.validateDate(result);
    } catch (error) {
      console.error('Error combining date and time:', error);
      return date;
    }
  }

  /**
   * Calculates date adjustment
   * @param {Date} baseDate - Base date to adjust
   * @param {Object} adjustment - Adjustment parameters
   * @returns {Date} Adjusted date
   */
  static calculateDate(baseDate, adjustment) {
    try {
      const result = new Date(baseDate);
      if (adjustment.days) result.setDate(result.getDate() + adjustment.days);
      if (adjustment.months) result.setMonth(result.getMonth() + adjustment.months);
      if (adjustment.years) result.setFullYear(result.getFullYear() + adjustment.years);
      return this.validateDate(result);
    } catch (error) {
      console.error('Error calculating date:', error);
      return null;
    }
  }
}

module.exports = DateUtils; 