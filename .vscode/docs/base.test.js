import { parse, name } from './base.js';

describe('Base Parser', () => {
  describe('Input Validation', () => {
    test('should handle null input', async () => {
      await expect(parse(null)).rejects.toThrow('Invalid input');
    });

    test('should handle undefined input', async () => {
      await expect(parse(undefined)).rejects.toThrow('Invalid input');
    });

    test('should handle empty string input', async () => {
      await expect(parse('')).rejects.toThrow('Invalid input');
    });

    test('should handle non-string input', async () => {
      await expect(parse(123)).rejects.toThrow('Invalid input');
      await expect(parse({})).rejects.toThrow('Invalid input');
      await expect(parse([])).rejects.toThrow('Invalid input');
      await expect(parse(true)).rejects.toThrow('Invalid input');
      await expect(parse(Symbol('test'))).rejects.toThrow('Invalid input');
    });

    test('should handle whitespace-only input', async () => {
      await expect(parse('   ')).rejects.toThrow('Invalid input');
      await expect(parse('\n\t\r')).rejects.toThrow('Invalid input');
    });

    test('should handle special characters', async () => {
      await expect(parse('\0')).rejects.toThrow('Invalid input');
      await expect(parse('\x1F')).rejects.toThrow('Invalid input');
    });
  });

  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[base:test]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[base:test]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      // This should never happen with base parser due to implicit pattern
      // but including for completeness
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should maintain consistent value structure', async () => {
      const result = await parse('[base:test]');
      expect(result).toEqual({
        type: 'base',
        value: expect.any(Object),
        metadata: expect.any(Object)
      });
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit patterns', async () => {
      const result = await parse('[base:test value]');
      expect(result).toEqual({
        type: 'base',
        value: {
          field: 'test value'
        },
        metadata: {
          confidence: 0.95,
          pattern: 'explicit_pattern',
          originalMatch: '[base:test value]'
        }
      });
    });

    test('should detect pattern with parameters', async () => {
      const result = await parse('[base:test(key=value)]');
      expect(result).toEqual({
        type: 'base',
        value: {
          field: 'test',
          parameters: {
            key: 'value'
          }
        },
        metadata: {
          confidence: 0.95,
          pattern: 'parameterized_pattern',
          originalMatch: '[base:test(key=value)]'
        }
      });
    });

    test('should detect standard patterns', async () => {
      const result = await parse('basic value');
      expect(result).toEqual({
        type: 'base',
        value: {
          field: 'basic value'
        },
        metadata: {
          confidence: 0.90,
          pattern: 'standard_pattern',
          originalMatch: 'basic value'
        }
      });
    });

    test('should detect multiple patterns', async () => {
      const result = await parse('[base:test] basic value');
      expect(result).toEqual({
        type: 'base',
        value: {
          field: 'test',
          alternatives: ['basic value']
        },
        metadata: {
          confidence: 0.95,
          pattern: 'multiple_patterns',
          originalMatch: '[base:test] basic value'
        }
      });
    });

    test('should handle pattern variations', async () => {
      const variations = [
        { input: '[BASE:test]', field: 'test' },
        { input: '[base: test]', field: 'test' },
        { input: '[base:test ]', field: 'test' },
        { input: '[ base:test]', field: 'test' }
      ];

      for (const { input, field } of variations) {
        const result = await parse(input);
        expect(result.value.field).toBe(field);
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[base:test]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('basic value');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('some random text');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for pattern at start of text', async () => {
      const result = await parse('[base:test] other text');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[base:test] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should prioritize explicit patterns over standard patterns', async () => {
      const result = await parse('[base:test] basic value');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.metadata.pattern).toBe('multiple_patterns');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed patterns', async () => {
      const malformed = [
        '[base:]',
        '[base: ]',
        '[base]',
        'base:test]',
        '[base:test'
      ];

      for (const pattern of malformed) {
        const result = await parse(pattern);
        expect(result.metadata.confidence).toBeLessThan(0.90);
      }
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[base:test()]',
        '[base:test(key)]',
        '[base:test(key=)]',
        '[base:test(=value)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result.metadata.confidence).toBeLessThan(0.90);
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Mock internal function to throw
      const originalParse = parse._parseInternal;
      parse._parseInternal = () => {
        throw new Error('Parser error');
      };

      try {
        await expect(parse('[base:test]')).rejects.toThrow('Parser error');
      } finally {
        // Restore original function
        parse._parseInternal = originalParse;
      }
    });

    test('should handle invalid characters in field', async () => {
      const invalidChars = [
        '[base:\0test]',
        '[base:\x1Ftest]',
        '[base:test\x7F]'
      ];

      for (const char of invalidChars) {
        await expect(parse(char)).rejects.toThrow('Invalid input');
      }
    });
  });
});
