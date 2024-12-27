import { name, parse } from '../../src/services/parser/parsers/progress.js';

describe('Progress Parser', () => {
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

    test('returns null for text without progress', async () => {
      const result = await parse('Regular text without progress');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit progress markers', async () => {
      const result = await parse('[progress:75%]');
      expect(result).toEqual({
        type: 'progress',
        value: {
          percentage: 75
        },
        metadata: {
          pattern: 'explicit',
          confidence: 0.95,
          originalMatch: '[progress:75%]'
        }
      });
    });

    test('should detect inferred progress', async () => {
      const result = await parse('Task is 50% complete');
      expect(result).toEqual({
        type: 'progress',
        value: {
          percentage: 50
        },
        metadata: {
          pattern: 'inferred',
          confidence: 0.8,
          originalMatch: '50% complete'
        }
      });
    });

    test('should handle various completion terms', async () => {
      const terms = ['complete', 'done', 'finished'];
      for (const term of terms) {
        const result = await parse(`25% ${term}`);
        expect(result.value.percentage).toBe(25);
      }
    });
  });

  describe('Percentage Validation', () => {
    test('should handle valid percentage range', async () => {
      const percentages = [0, 25, 50, 75, 100];
      for (const percentage of percentages) {
        const result = await parse(`[progress:${percentage}%]`);
        expect(result.value.percentage).toBe(percentage);
      }
    });

    test('should reject invalid percentages', async () => {
      const invalidPercentages = [-10, 101, 150];
      for (const percentage of invalidPercentages) {
        const result = await parse(`[progress:${percentage}%]`);
        expect(result).toBeNull();
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit progress', async () => {
      const result = await parse('[progress:75%]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for inferred progress', async () => {
      const result = await parse('75% complete');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid progress format', async () => {
      const result = await parse('[progress:]');
      expect(result).toBeNull();
    });

    test('should handle non-numeric percentages', async () => {
      const result = await parse('[progress:abc%]');
      expect(result).toBeNull();
    });
  });
});
