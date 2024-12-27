import { jest } from '@jest/globals';

// Mock settings
export const defaultSettings = {
  theme: 'light',
  fontSize: 14
};

// Mock settings functions
export const applySettings = jest.fn();
export const updateSidebarState = jest.fn();
export const loadSettings = jest.fn();
export const saveSettingsToFile = jest.fn();
export const validateSettings = jest.fn();
export const migrateSettings = jest.fn();
export const getDefaultSettings = jest.fn().mockReturnValue(defaultSettings);

// Export default object
export default {
  defaultSettings,
  applySettings,
  updateSidebarState,
  loadSettings,
  saveSettingsToFile,
  validateSettings,
  migrateSettings,
  getDefaultSettings
};
