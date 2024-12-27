import { parse, name } from '../../src/services/parser/parsers/base.js';

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
          originalMatch: expect.any(String)
        }
      });
    });

    test('should detect implicit patterns', async () => {
      const result = await parse('any text here');
      expect(result).toEqual({
        type: 'base',
        value: {
          field: expect.any(String)
        },
        metadata: {
          confidence: expect.any(Number),
          pattern: expect.any(String),
          originalMatch: expect.any(String)
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit patterns', async () => {
      const result = await parse('[base:value]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for inferred patterns', async () => {
      const result = await parse('basic value');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.9);
    });

    test('should prioritize explicit patterns over standard patterns', async () => {
      const result = await parse('[base:test] basic value');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.metadata.pattern).toBe('explicit_pattern');
    });
  });

  describe('Return Format', () => {
    test('should return null for no matches', async () => {
      // This should never happen with base parser due to implicit pattern
      // but including for completeness
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should return correct type property', async () => {
      const result = await parse('test');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('test');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });
  });
});
