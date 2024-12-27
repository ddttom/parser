import { jest } from '@jest/globals';

// Mock settings modules
const settingsModule = {
  defaultSettings: {
    theme: 'light',
    fontSize: 14
  },
  applySettings: jest.fn(),
  updateSidebarState: jest.fn(),
  loadSettings: jest.fn(),
  saveSettingsToFile: jest.fn(),
  validateSettings: jest.fn(),
  migrateSettings: jest.fn(),
  getDefaultSettings: jest.fn()
};

const settingsUIModule = {
  showSettingsModal: jest.fn(),
  closeSettingsModal: jest.fn(),
  setupSettingsUI: jest.fn(),
  saveSettings: jest.fn()
};

// Mock imports
jest.mock('./settings/settings.js', () => settingsModule, { virtual: true });
jest.mock('./settings/settingsUI.js', () => settingsUIModule, { virtual: true });

// Mock state management
export const stateManager = {
  subscribe: jest.fn(),
  dispatch: jest.fn(),
  getState: jest.fn()
};

// Mock actions and selectors
export const actions = {
  setEditorState: jest.fn(),
  setTheme: jest.fn(),
  setModal: jest.fn(),
  setError: jest.fn(),
  deleteEntry: jest.fn()
};

export const selectors = {
  getCurrentTheme: jest.fn(),
  getEntryById: jest.fn()
};

// Mock editor functions
export const initializeEditor = jest.fn();
export const handleImageUpload = jest.fn();
export const showEditor = jest.fn();
export const clearEditor = jest.fn();
export const getEditorContent = jest.fn();
export const setupKeyboardShortcuts = jest.fn();

// Mock entry list functions
export const loadEntriesList = jest.fn();
export const showEntriesList = jest.fn();
export const toggleFilters = jest.fn();
export const toggleSortMenu = jest.fn();

// Mock entry actions
export const createNewEntry = jest.fn();
export const loadEntry = jest.fn();
export const saveEntry = jest.fn();
export const getCurrentEntryId = jest.fn();

// Mock settings functions
export const defaultSettings = settingsModule.defaultSettings;
export const applySettings = settingsModule.applySettings;
export const updateSidebarState = settingsModule.updateSidebarState;
export const showSettingsModal = settingsUIModule.showSettingsModal;
export const closeSettingsModal = settingsUIModule.closeSettingsModal;
export const setupSettingsUI = settingsUIModule.setupSettingsUI;
export const saveSettings = settingsUIModule.saveSettings;

// Mock sync functions
export const setupAutoSync = jest.fn();

// Mock event handlers
export const handleModalChange = jest.fn();
export const handleError = jest.fn();
export const updateEditor = jest.fn();
export const updateEntryList = jest.fn();
export const updateTheme = jest.fn();
export const setupModalListeners = jest.fn();

// Mock logger
export const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Export default object
export default {
  stateManager,
  actions,
  selectors,
  initializeEditor,
  handleImageUpload,
  showEditor,
  clearEditor,
  getEditorContent,
  setupKeyboardShortcuts,
  loadEntriesList,
  showEntriesList,
  toggleFilters,
  toggleSortMenu,
  createNewEntry,
  loadEntry,
  saveEntry,
  getCurrentEntryId,
  defaultSettings,
  applySettings,
  updateSidebarState,
  showSettingsModal,
  closeSettingsModal,
  setupSettingsUI,
  saveSettings,
  setupAutoSync,
  handleModalChange,
  handleError,
  updateEditor,
  updateEntryList,
  updateTheme,
  setupModalListeners,
  logger
};
