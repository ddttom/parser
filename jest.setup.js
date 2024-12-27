// Set up global TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set up URL polyfill for Node.js environment
const { URL } = require('url');
global.URL = URL;

// Mock Electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('tests/__test_data__')
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    send: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  }
}));

// Set up window.api mock
global.window = {
  api: {
    invoke: jest.fn(),
    on: jest.fn(),
    send: jest.fn()
  }
};

// Set up process.env defaults
process.env.NODE_ENV = 'test';
