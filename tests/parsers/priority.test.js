import { name, parse } from '../../src/services/parser/parsers/priority.js';

describe('Priority Parser', () => {
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
      const result = await parse('[priority:high]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[priority:high]');
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
    test('should detect explicit priority markers', async () => {
      const result = await parse('[priority:high]');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'explicit_priority',
          confidence: 0.95,
          originalMatch: '[priority:high]'
        }
      });
    });

    test('should detect priority hashtags', async () => {
      const result = await parse('Task #urgent');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'urgent',
          score: 4
        },
        metadata: {
          pattern: 'hashtag',
          confidence: 0.90,
          originalMatch: '#urgent'
        }
      });
    });

    test('should detect priority keywords', async () => {
      const result = await parse('High priority task');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'keyword',
          confidence: 0.85,
          originalMatch: 'high priority'
        }
      });
    });

    test('should detect multiple priority indicators', async () => {
      const result = await parse('[priority:high] #urgent High priority task');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'urgent',
          score: 4,
          indicators: ['high', 'urgent', 'high']
        },
        metadata: {
          pattern: 'multiple_indicators',
          confidence: 0.95,
          originalMatch: '[priority:high] #urgent High priority'
        }
      });
    });
  });

  describe('Priority Levels', () => {
    test('should handle all priority levels', async () => {
      const levels = [
        { input: '[priority:critical]', level: 'critical', score: 5 },
        { input: '[priority:urgent]', level: 'urgent', score: 4 },
        { input: '[priority:high]', level: 'high', score: 3 },
        { input: '[priority:medium]', level: 'medium', score: 2 },
        { input: '[priority:low]', level: 'low', score: 1 }
      ];

      for (const { input, level, score } of levels) {
        const result = await parse(input);
        expect(result.value.level).toBe(level);
        expect(result.value.score).toBe(score);
      }
    });

    test('should handle priority aliases', async () => {
      const aliases = [
        { input: '#asap', level: 'urgent' },
        { input: '#important', level: 'high' },
        { input: '#normal', level: 'medium' },
        { input: '#minor', level: 'low' }
      ];

      for (const { input, level } of aliases) {
        const result = await parse(input);
        expect(result.value.level).toBe(level);
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[priority:high]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('#urgent');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('high priority');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for priority at start of text', async () => {
      const result = await parse('[priority:high] task');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[priority:high] #urgent');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid priority format', async () => {
      const result = await parse('[priority:]');
      expect(result).toBeNull();
    });

    test('should handle empty priority value', async () => {
      const result = await parse('[priority: ]');
      expect(result).toBeNull();
    });

    test('should handle invalid priority levels', async () => {
      const invalidLevels = [
        '[priority:invalid]',
        '[priority:123]',
        '[priority:!@#]'
      ];

      for (const level of invalidLevels) {
        const result = await parse(level);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed hashtags', async () => {
      const invalidTags = [
        '#',
        '# ',
        '#123',
        '#!@#'
      ];

      for (const tag of invalidTags) {
        const result = await parse(tag);
        expect(result).toBeNull();
      }
    });
  });
});
