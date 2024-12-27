import { jest } from '@jest/globals';

// Mock settings UI functions
export const showSettingsModal = jest.fn();
export const closeSettingsModal = jest.fn();
export const setupSettingsUI = jest.fn();
export const saveSettings = jest.fn();

// Export default object
export default {
  showSettingsModal,
  closeSettingsModal,
  setupSettingsUI,
  saveSettings
};
