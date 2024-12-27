import ConfigManager from '../src/config/ConfigManager.js';
import { jest } from '@jest/globals';

describe('Configuration Tests', () => {
  let configManager;
  let settingsService;

  beforeEach(() => {
    settingsService = {
      getAllSettings: jest.fn(),
      saveSetting: jest.fn(),
      saveAllSettings: jest.fn()
    };
    configManager = new ConfigManager(settingsService);
  });

  describe('Initialization', () => {
    test('merges settings with defaults', async () => {
      const mockSettings = {
        parser: {
          maxDepth: 3,
          ignoreFiles: ['.git', 'node_modules'],
          outputFormat: 'json',
          tellTruth: true
        },
        reminders: {
          defaultMinutes: 15,
          allowMultiple: true
        }
      };
      settingsService.getAllSettings.mockResolvedValue(mockSettings);
      
      const config = await configManager.initialize();

      expect(config.parser.maxDepth).toBe(3);
      expect(config.parser.ignoreFiles).toEqual(['.git', 'node_modules']);
      expect(config.parser.outputFormat).toBe('json');
    });

    test('validates configuration on load', async () => {
      const invalidSettings = {
        parser: {
          maxDepth: -1,
          ignoreFiles: '.git', // Not an array
          outputFormat: 'invalid',
          tellTruth: true
        },
        reminders: {
          defaultMinutes: 15,
          allowMultiple: true
        }
      };
      settingsService.getAllSettings.mockResolvedValue(invalidSettings);
      
      await expect(configManager.initialize()).rejects.toThrow('Invalid config value for parser.ignoreFiles');
    });
  });

  describe('Settings Updates', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    test('updates and persists settings', async () => {
      const updates = {
        maxDepth: 3,
        ignoreFiles: ['.git', 'node_modules'],
        outputFormat: 'json',
        tellTruth: true
      };

      await configManager.updateSettings('parser', updates);

      expect(settingsService.saveSetting).toHaveBeenCalledWith('parser', updates);
      expect(configManager.get('parser')).toMatchObject(updates);
    });

    test('emits change events', async () => {
      const listener = jest.fn();
      configManager.on('configChanged', listener);

      const updates = {
        maxDepth: 3,
        ignoreFiles: ['.git', 'node_modules'],
        outputFormat: 'json',
        tellTruth: true
      };

      await configManager.updateSettings('parser', updates);

      expect(listener).toHaveBeenCalledWith({
        category: 'parser',
        settings: updates
      });
    });
  });

  describe('Environment Variables', () => {
    beforeEach(() => {
      process.env['pim.parser.maxDepth'] = '10';
      process.env['pim.parser.tellTruth'] = 'false';
    });

    afterEach(() => {
      delete process.env['pim.parser.maxDepth'];
      delete process.env['pim.parser.tellTruth'];
    });

    test('applies environment variables', async () => {
      const config = await configManager.initialize();

      // Should apply environment variable value
      expect(configManager.get('parser').maxDepth).toBe(10);
    });

    test('handles array values', async () => {
      process.env['pim.parser.ignoreFiles'] = '["temp", "logs"]';
      const config = await configManager.initialize();

      expect(config.parser.ignoreFiles).toEqual(['temp', 'logs']);
      delete process.env['pim.parser.ignoreFiles'];
    });
  });

  describe('Backup and Restore', () => {
    test('creates and restores backups', async () => {
      await configManager.initialize();

      const updates = {
        maxDepth: 3,
        ignoreFiles: ['.git', 'node_modules'],
        outputFormat: 'json',
        tellTruth: true
      };

      await configManager.updateSettings('parser', updates);
      await configManager.backup();

      expect(settingsService.saveAllSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          parser: updates
        })
      );
    });
  });
});
