/**
 * Mock Database for Testing
 */
class MockDatabase {
  constructor() {
    this.initialized = false;
    this.settings = {};
  }

  async initialize() {
    this.initialized = true;
    return true;
  }

  async getAllSettings() {
    return this.settings;
  }

  async saveSetting(category, settings) {
    if (!this.settings[category]) {
      this.settings[category] = {};
    }
    this.settings[category] = {
      ...this.settings[category],
      ...settings
    };
    return true;
  }

  async getSetting(category) {
    return this.settings[category] || {};
  }

  // Helper method for testing
  _reset() {
    this.settings = {};
    this.initialized = false;
  }
}

module.exports = MockDatabase; 