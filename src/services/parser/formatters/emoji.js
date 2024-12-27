import { DEFAULT_CONFIG as CONFIG } from '../../../config/parser.config.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('EmojiFormatter');

/**
 * Format task with emojis
 * @param {Object} task - Task object
 * @returns {string} Formatted task string
 */
function formatTaskWithEmojis(task) {
  try {
    const emojis = [];
    
    // Add priority emoji
    if (task.priority === 'high') emojis.push('🔥');
    
    // Add category emojis
    if (task.categories?.includes('meetings')) emojis.push('👥');
    if (task.categories?.includes('calls')) emojis.push('📞');
    if (task.categories?.includes('reviews')) emojis.push('👀');
    
    // Add status emoji
    if (task.status === 'pending') emojis.push('⏳');
    if (task.status === 'in progress') emojis.push('🚀');
    if (task.status === 'completed') emojis.push('✅');
    if (task.status === 'blocked') emojis.push('🚫');
    
    return `${emojis.join(' ')} ${task.rawContent}`;
  } catch (error) {
    logger.error('Error formatting task with emojis:', error);
    return task.rawContent;
  }
}

/**
 * Format task with all emojis
 * @param {Object} task - Task object
 * @returns {string} Formatted task string with all emojis
 */
function formatTaskWithAllEmojis(task) {
  try {
    const emojis = [];
    
    // Add priority emoji
    if (task.priority === 'high') emojis.push('🔥');
    
    // Add urgency emoji
    if (task.urgency?.emoji) emojis.push(task.urgency.emoji);
    
    // Add complexity emoji
    if (task.complexity?.emoji) emojis.push(task.complexity.emoji);
    
    // Add category emojis
    if (task.categories?.includes('reviews')) emojis.push('👀');
    
    // Add status emoji
    if (task.status === 'in progress') emojis.push('🚀');
    
    return `${emojis.join(' ')} ${task.rawContent}`;
  } catch (error) {
    logger.error('Error formatting task with all emojis:', error);
    return task.rawContent;
  }
}

export {
  formatTaskWithEmojis,
  formatTaskWithAllEmojis,
};
