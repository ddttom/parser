import { validateParserInput } from '../../src/services/parser/utils/validation.js';

describe('Parser Input Validation', () => {
  describe('Invalid Inputs', () => {
    test('should handle null input', () => {
      const result = validateParserInput(null, 'TestParser');
      expect(result).toEqual({
        test: {
          error: 'INVALID_INPUT',
          message: 'TestParser: Input cannot be null'
        }
      });
    });

    test('should handle undefined input', () => {
      const result = validateParserInput(undefined, 'TestParser');
      expect(result).toEqual({
        test: {
          error: 'INVALID_INPUT',
          message: 'TestParser: Input cannot be undefined'
        }
      });
    });

    test('should handle empty string', () => {
      const result = validateParserInput('', 'TestParser');
      expect(result).toEqual({
        test: {
          error: 'INVALID_INPUT',
          message: 'TestParser: Input cannot be empty'
        }
      });
    });

    test('should handle whitespace-only string', () => {
      const result = validateParserInput('   ', 'TestParser');
      expect(result).toEqual({
        test: {
          error: 'INVALID_INPUT',
          message: 'TestParser: Input cannot be empty'
        }
      });
    });

    test('should handle non-string inputs', () => {
      const inputs = [
        123,
        0,
        -1,
        1.23,
        true,
        false,
        {},
        [],
        () => {},
        Symbol('test'),
        new Date()
      ];

      for (const input of inputs) {
        const result = validateParserInput(input, 'TestParser');
        expect(result).toEqual({
          test: {
            error: 'INVALID_INPUT',
            message: `TestParser: Input must be a string, got ${typeof input}`
          }
        });
      }
    });
  });

  describe('Valid Inputs', () => {
    test('should accept non-empty strings', () => {
      const inputs = [
        'test',
        ' test ',
        'Test String',
        '123',
        '[tag:test]',
        'multi\nline\nstring'
      ];

      for (const input of inputs) {
        const result = validateParserInput(input, 'TestParser');
        expect(result).toBeNull();
      }
    });

    test('should accept strings with special characters', () => {
      const inputs = [
        'test!@#$%^&*()',
        'unicode: 你好',
        'emoji: 👋',
        'quotes: "test" \'test\'',
        'escaped: \\n\\t\\r',
        'json: {"key": "value"}'
      ];

      for (const input of inputs) {
        const result = validateParserInput(input, 'TestParser');
        expect(result).toBeNull();
      }
    });
  });
});
