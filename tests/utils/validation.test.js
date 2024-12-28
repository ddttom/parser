import { validateParserInput } from '../../src/services/parser/utils/validation.js';

describe('Parser Input Validation', () => {
  describe('Invalid Inputs', () => {
    test('should handle null input', () => {
      const result = validateParserInput(null);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle undefined input', () => {
      const result = validateParserInput(undefined);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle empty string', () => {
      const result = validateParserInput('');
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle whitespace-only string', () => {
      const result = validateParserInput('   ');
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
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
        const result = validateParserInput(input);
        expect(result).toEqual({
          type: 'error',
          error: 'INVALID_INPUT',
          message: 'Input must be a non-empty string'
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
        const result = validateParserInput(input);
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
        const result = validateParserInput(input);
        expect(result).toBeNull();
      }
    });
  });
});
