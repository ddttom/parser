import { name, parse } from '../../src/services/parser/parsers/date.js';

describe('Date Parser', () => {
  describe('Input Validation', () => {
    test('should handle null input', async () => {
      const result = await parse(null);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle empty string', async () => {
      const result = await parse('');
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle undefined input', async () => {
      const result = await parse(undefined);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle non-string input', async () => {
      const numberResult = await parse(123);
      expect(numberResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const objectResult = await parse({});
      expect(objectResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const arrayResult = await parse([]);
      expect(arrayResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });
  });

  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should parse ISO format dates', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          date: '2024-01-20',
          format: 'ISO'
        },
        metadata: {
          pattern: 'explicit_iso',
          confidence: 0.95
        }
      });
    });

    test('should parse natural language dates', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          date: '2024-01-20',
          format: 'natural'
        },
        metadata: {
          pattern: 'natural_date',
          confidence: 0.90
        }
      });
    });

    test('should parse relative dates', async () => {
      const result = await parse('tomorrow');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          format: 'relative'
        },
        metadata: {
          pattern: 'relative_date',
          confidence: 0.85
        }
      });
      expect(result.value.date).toBeDefined();
    });

    test('should parse weekday references', async () => {
      const result = await parse('next Wednesday');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          format: 'weekday'
        },
        metadata: {
          pattern: 'weekday_reference',
          confidence: 0.85
        }
      });
      expect(result.value.date).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('sometime next week');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for date at start of text', async () => {
      const result = await parse('[date:2024-01-20] is the deadline');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[date:2024-01-20] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid date format', async () => {
      const result = await parse('[date:invalid]');
      expect(result).toBeNull();
    });

    test('should handle invalid month', async () => {
      const result = await parse('[date:2024-13-01]');
      expect(result).toBeNull();
    });

    test('should handle invalid day', async () => {
      const result = await parse('[date:2024-01-32]');
      expect(result).toBeNull();
    });

    test('should handle malformed date strings', async () => {
      const result = await parse('[date:2024/01/01]');
      expect(result).toBeNull();
    });
  });

  describe('Date Calculations', () => {
    test('should calculate next weekday correctly', async () => {
      const result = await parse('next Wednesday');
      expect(result.value.date).toBeDefined();
      const date = new Date(result.value.date);
      expect(date.getDay()).toBe(3); // Wednesday is day 3
      expect(date > new Date()).toBe(true); // Should be in the future
    });

    test('should handle relative date calculations', async () => {
      const result = await parse('tomorrow');
      expect(result.value.date).toBeDefined();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.value.date).toBe(tomorrow.toISOString().split('T')[0]);
    });
  });

  describe('Metadata Validation', () => {
    test('includes original match in metadata', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.metadata.originalMatch).toBe('[date:2024-01-20]');
    });

    test('includes pattern type in metadata', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.metadata.pattern).toBe('explicit_iso');
    });

    test('natural pattern is correctly identified', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.metadata.pattern).toBe('natural_date');
    });
  });
});
