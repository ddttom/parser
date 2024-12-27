import { jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Create test directory
export const TEST_DIR = path.join(os.tmpdir(), 'pim-test');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Initialize global objects
global.window = global.window || {};
global.document = global.document || {};

// Mock Quill globally
global.Quill = class Quill {
  constructor(element, options) {
    this.root = element;
    this.options = options;
    this.getText = jest.fn().mockReturnValue('Test content');
    this.getSelection = jest.fn().mockReturnValue({ index: 0 });
    this.insertEmbed = jest.fn();
    this.setContents = jest.fn();
    this.focus = jest.fn();
    this.clipboard = {
      dangerouslyPasteHTML: jest.fn()
    };
  }
};

// Mock window.api
global.window.api = {
  on: jest.fn(),
  invoke: jest.fn(),
  send: jest.fn()
};

// Mock getCurrentEntryId
global.getCurrentEntryId = jest.fn().mockReturnValue('test-entry-id');

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Setup jsdom environment
if (typeof document === 'undefined') {
  const jsdom = require('jsdom');
  const { JSDOM } = jsdom;
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost'
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
}
