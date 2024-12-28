import { name, parse } from '../../src/services/parser/parsers/progress.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

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
      const result = await parse('[progress:75%]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[progress:75%]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(String),
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
    test('should detect explicit progress markers', async () => {
      const result = await parse('[progress:75%]');
      expect(result).toEqual({
        type: 'progress',
        value: {
          percentage: 75,
          description: null
        },
        metadata: {
          pattern: 'explicit',
          confidence: Confidence.HIGH,
          originalMatch: '[progress:75%]'
        }
      });
    });

    test('should detect progress with description', async () => {
      const result = await parse('[progress:75%, coding phase]');
      expect(result).toEqual({
        type: 'progress',
        value: {
          percentage: 75,
          description: 'coding phase'
        },
        metadata: {
          pattern: 'explicit_with_description',
          confidence: Confidence.HIGH,
          originalMatch: '[progress:75%, coding phase]'
        }
      });
    });

    test('should detect percentage patterns', async () => {
      const result = await parse('Task is 50% complete');
      expect(result).toEqual({
        type: 'progress',
        value: {
          percentage: 50,
          description: null
        },
        metadata: {
          pattern: 'percentage',
          confidence: Confidence.MEDIUM,
          originalMatch: '50% complete'
        }
      });
    });

    test('should handle various completion terms', async () => {
      const terms = ['complete', 'done', 'finished', 'completed'];
      for (const term of terms) {
        const result = await parse(`25% ${term}`);
        expect(result.value.percentage).toBe(25);
      }
    });

    test('should detect fractional progress', async () => {
      const result = await parse('Task is three-quarters done');
      expect(result).toEqual({
        type: 'progress',
        value: {
          percentage: 75,
          description: null
        },
        metadata: {
          pattern: 'fractional',
          confidence: Confidence.MEDIUM,
          originalMatch: 'three-quarters done'
        }
      });
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

    test('should handle decimal percentages', async () => {
      const result = await parse('[progress:33.3%]');
      expect(result.value.percentage).toBe(33.3);
    });

    test('should reject invalid percentages', async () => {
      const invalidPercentages = [-10, 101, 150, 'abc'];
      for (const percentage of invalidPercentages) {
        const result = await parse(`[progress:${percentage}%]`);
        expect(result).toBeNull();
      }
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[progress:75%]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for explicit patterns with description', async () => {
      const result = await parse('[progress:75%, coding phase]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for percentage patterns', async () => {
      const result = await parse('75% complete');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have MEDIUM confidence for fractional patterns', async () => {
      const result = await parse('three-quarters done');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid progress format', async () => {
      const result = await parse('[progress:]');
      expect(result).toBeNull();
    });

    test('should handle empty progress value', async () => {
      const result = await parse('[progress: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed percentages', async () => {
      const invalidFormats = [
        '[progress:%]',
        '[progress:75]',
        '[progress:75%%]',
        '[progress:percent]'
      ];

      for (const format of invalidFormats) {
        const result = await parse(format);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid descriptions', async () => {
      const invalidDescriptions = [
        '[progress:75%, ]',
        '[progress:75%,]',
        '[progress:75%, @#$]'
      ];

      for (const desc of invalidDescriptions) {
        const result = await parse(desc);
        expect(result).toBeNull();
      }
    });
  });
});
