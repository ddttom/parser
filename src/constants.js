/*
 * Global Constants for PIM Application
 * 
 * This module serves as the single source of truth for all application constants.
 * It centralizes configuration values, action types, and messages to:
 * - Ensure consistency across the application
 * - Simplify maintenance and updates
 * - Reduce duplicate values and potential errors
 * - Provide clear documentation of constant usage
 * 
 * Usage:
 * import { ActionTypes, IpcChannels, UI } from './constants.js';
 * 
 * Organization:
 * - Constants are grouped by functionality
 * - Each group includes detailed usage documentation
 * - Related constants are kept together for clarity
 */

/*
 * Action Types for State Management
 * Used in: src/services/state-manager.js
 * 
 * These constants define all possible state mutations in the application.
 * Each action type corresponds to a specific state change operation and
 * is used by the reducer to determine how to update the state.
 * 
 * Naming Convention:
 * - SET_*: Direct value updates
 * - UPDATE_*: Partial updates or merges
 * - DELETE_*: Remove items from state
 */
export const ActionTypes = {
    // UI State Actions
    SET_MODAL: 'SET_MODAL',           // Used when showing/hiding modals
    SET_THEME: 'SET_THEME',           // Used when changing application theme
    SET_EDITOR_STATE: 'SET_EDITOR_STATE', // Used for editor content/selection updates
    
    // Parser State Actions
    SET_PARSER_RESULTS: 'SET_PARSER_RESULTS',     // Used when new parser results are available
    UPDATE_PARSER_STATS: 'UPDATE_PARSER_STATS',   // Used to update parser performance metrics
    
    // Application State Actions
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',   // Used when saving user settings
    SET_ERROR: 'SET_ERROR',              // Used for error handling across the app
    
    // Entry State Actions
    SET_ENTRIES: 'SET_ENTRIES',          // Used when loading/updating entry list
    UPDATE_ENTRY: 'UPDATE_ENTRY',        // Used when modifying a single entry
    DELETE_ENTRY: 'DELETE_ENTRY'         // Used when removing an entry
};

/*
 * IPC (Inter-Process Communication) Channels
 * Used in: src/preload.cjs, src/main.cjs
 * 
 * Defines all valid communication channels between main and renderer processes.
 * These channels are used for:
 * - Secure data transfer between processes
 * - Event notifications
 * - State synchronization
 * - Error handling
 * 
 * Security Note:
 * - All channels must be validated before use
 * - Only whitelisted channels are allowed
 * - Messages must include proper error handling
 */
export const IpcChannels = {
    // Settings Operations
    GET_SETTINGS: 'get-settings',         // Request user settings from main process
    SAVE_SETTINGS: 'save-settings',       // Save updated settings to main process
    SETTINGS_CHANGED: 'settings-changed', // Notify renderer of settings updates
    
    // Database Operations
    GET_ENTRIES: 'get-entries',           // Request entries from database
    SAVE_ENTRY: 'save-entry',             // Save single entry to database
    DELETE_ENTRY: 'delete-entry',         // Delete entry from database
    SYNC_ENTRIES: 'sync-entries',         // Sync entries between processes
    ENTRIES_CHANGED: 'entries-changed',   // Notify of entry updates
    
    // Theme Operations
    GET_THEME: 'get-theme',               // Request current theme
    SET_THEME: 'set-theme',               // Update application theme
    THEME_CHANGED: 'theme-changed',       // Notify of theme changes
    
    // Parser Operations
    PARSE_TEXT: 'parse-text',             // Request text parsing
    
    // Error Handling
    ERROR: 'error'                        // Error notification channel
};

/*
 * UI Constants
 * Used in: src/renderer/*, src/main.cjs
 * 
 * Centralizes all user interface related constants including:
 * - Theme definitions and color schemes
 * - Window dimensions and constraints
 * - Modal types and configurations
 * - Editor settings and preferences
 * 
 * These values ensure consistent UI behavior and appearance
 * across the entire application.
 */
export const UI = {
    // Theme Settings
    Themes: {
        LIGHT: 'light',
        DARK: 'dark'
    },
    
    // Modal Types
    Modals: {
        SETTINGS: 'settings',
        EDITOR: 'editor',
        CONFIRM: 'confirm'
    },
    
    // Window Settings (used in src/main.cjs)
    Window: {
        DEFAULT_WIDTH: 1200,
        DEFAULT_HEIGHT: 800,
        MIN_WIDTH: 800,
        MIN_HEIGHT: 600
    },
    
    // Editor Settings
    Editor: {
        DEFAULT_FONT_SIZE: 14,
        LINE_HEIGHT: 1.5,
        TAB_SIZE: 2
    }
};

/*
 * Database Constants
 * Used in: src/services/json-database.cjs
 * 
 * Defines database-related configuration including:
 * - File paths for data storage
 * - Operation types for CRUD actions
 * - Backup locations and strategies
 * 
 * Important:
 * - Paths are relative to application root
 * - Ensure write permissions for all paths
 * - Maintain atomic operations for data integrity
 */
export const Database = {
    // File Paths
    Paths: {
        SETTINGS: 'data/settings.json',
        DATABASE: 'data/pim.db',
        BACKUP: 'data/backup'
    },
    
    // Operation Types
    Operations: {
        CREATE: 'create',
        READ: 'read',
        UPDATE: 'update',
        DELETE: 'delete'
    }
};

/*
 * Logger Constants
 * Used in: src/utils/logger.js
 * 
 * Configuration for application-wide logging system:
 * - Log levels for different types of information
 * - File rotation and retention policies
 * - Maximum file sizes and counts
 * 
 * Note:
 * - Log files are automatically rotated when size limit is reached
 * - Oldest logs are removed when max file count is exceeded
 * - Critical errors are always logged regardless of level
 */
export const Logger = {
    Levels: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    },
    
    // Log File Settings
    Settings: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        MAX_FILES: 5,
        FILENAME: 'pim.log'
    }
};

/*
 * State Management Constants
 * Used in: src/services/state-manager.js
 * 
 * Defines the structure and validation rules for application state:
 * - Initial state shape and default values
 * - Required state properties
 * - Validation rules and constraints
 * - Confidence score ranges
 * 
 * Important:
 * - All state updates must maintain this structure
 * - Validation ensures state integrity
 * - Default values provide fallback behavior
 */
export const State = {
    // Initial State Structure
    InitialState: {
        ui: {
            activeModal: null,
            theme: UI.Themes.LIGHT,
            editor: {
                content: '',
                selection: null
            }
        },
        parser: {
            results: [],
            stats: {
                totalProcessed: 0,
                averageConfidence: 0
            }
        },
        settings: {},
        error: null,
        entries: {
            list: [],
            selectedId: null
        }
    },
    
    // Validation Settings
    Validation: {
        REQUIRED_PROPS: ['ui', 'parser', 'settings', 'entries'],
        MIN_CONFIDENCE: 0,
        MAX_CONFIDENCE: 1
    }
};

/*
 * Error Messages
 * Used: Throughout the application
 * 
 * Centralizes all error messages for consistency and maintenance:
 * - State validation errors
 * - IPC communication failures
 * - Database operation errors
 * - Settings management issues
 * 
 * Benefits:
 * - Consistent error reporting
 * - Easy translation support
 * - Clear error identification
 * - Simplified error handling
 */
export const ErrorMessages = {
    // State Validation
    MISSING_PROPERTY: (prop) => `Missing required state property: ${prop}`,
    INVALID_THEME: 'Theme must be a string',
    INVALID_RESULTS: 'Parser results must be an array',
    INVALID_ENTRIES: 'Entries list must be an array',
    
    // IPC Communication
    INVALID_CHANNEL: (channel) => `Invalid IPC channel: ${channel}`,
    INVALID_MESSAGE: 'Invalid IPC message data',
    
    // Database Operations
    DB_CONNECTION: 'Failed to connect to database',
    ENTRY_NOT_FOUND: (id) => `Entry with id ${id} not found`,
    SAVE_FAILED: 'Failed to save data',
    
    // Settings Operations
    SETTINGS_LOAD: 'Failed to load settings',
    SETTINGS_SAVE: 'Failed to save settings'
};

/*
 * Performance Constants
 * Used: Throughout the application
 * 
 * Defines performance-related settings and thresholds:
 * - Debounce/throttle delays for UI operations
 * - Batch processing limits
 * - Cache sizes and TTL values
 * 
 * These values are carefully tuned to balance:
 * - Application responsiveness
 * - Resource utilization
 * - Memory consumption
 * - User experience
 */
export const Performance = {
    // Debounce/Throttle Settings
    DEBOUNCE_DELAY: 300,      // ms delay for input handling
    THROTTLE_DELAY: 100,      // ms delay for scroll handling
    
    // Batch Processing
    BATCH_SIZE: 100,          // number of items to process in batch
    
    // Cache Settings
    CACHE_SIZE: 1000,         // maximum number of cached items
    CACHE_TTL: 5 * 60 * 1000  // cache time-to-live (5 minutes)
};
