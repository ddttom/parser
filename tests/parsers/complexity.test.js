import { name, parse } from '../../src/services/parser/parsers/complexity.js';

describe('Complexity Parser', () => {
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
      const result = await parse('[complexity:high]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[complexity:high]');
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
    test('should detect explicit complexity markers', async () => {
      const result = await parse('Task [complexity:high]');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'explicit_complexity',
          confidence: 0.9,
          originalMatch: '[complexity:high]'
        }
      });
    });

    test('should detect numeric complexity', async () => {
      const result = await parse('Task [complexity:3]');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'numeric_complexity',
          confidence: 0.95,
          originalMatch: '[complexity:3]'
        }
      });
    });

    test('should detect complexity keywords', async () => {
      const result = await parse('This is a complex task');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'keyword_complexity',
          confidence: 0.8,
          originalMatch: 'complex'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[complexity:3]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('[complexity:high]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('this is complex');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for complexity at start of text', async () => {
      const result = await parse('[complexity:high] task');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[complexity:3] is important');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid complexity values', async () => {
      const result = await parse('[complexity:invalid]');
      expect(result).toBeNull();
    });
  });
});
