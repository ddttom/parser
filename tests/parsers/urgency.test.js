import { name, parse } from '../../src/services/parser/parsers/urgency.js';

describe('Urgency Parser', () => {
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
      const result = await parse('[urgency:high]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[urgency:high]');
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
    test('should detect explicit urgency markers', async () => {
      const result = await parse('[urgency:high]');
      expect(result).toEqual({
        type: 'urgency',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'explicit_urgency',
          confidence: 0.95,
          originalMatch: '[urgency:high]'
        }
      });
    });

    test('should detect urgency with parameters', async () => {
      const result = await parse('[urgency:high(reason=deadline)]');
      expect(result).toEqual({
        type: 'urgency',
        value: {
          level: 'high',
          score: 3,
          parameters: {
            reason: 'deadline'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: 0.95,
          originalMatch: '[urgency:high(reason=deadline)]'
        }
      });
    });

    test('should detect urgency keywords', async () => {
      const keywords = [
        { input: 'URGENT', level: 'high', score: 3 },
        { input: 'ASAP', level: 'high', score: 3 },
        { input: 'Critical', level: 'critical', score: 4 },
        { input: 'Time-sensitive', level: 'high', score: 3 }
      ];

      for (const { input, level, score } of keywords) {
        const result = await parse(`${input}: Complete report`);
        expect(result.value).toEqual({
          level,
          score,
          keyword: input.toLowerCase()
        });
      }
    });

    test('should detect time-based urgency', async () => {
      const expressions = [
        'Must complete ASAP',
        'Need this right away',
        'Required immediately',
        'Do this now'
      ];

      for (const expr of expressions) {
        const result = await parse(expr);
        expect(result.value).toEqual({
          level: 'high',
          score: 3,
          timeBased: true
        });
      }
    });

    test('should detect multiple urgency indicators', async () => {
      const result = await parse('[urgency:high] URGENT: Complete ASAP');
      expect(result).toEqual({
        type: 'urgency',
        value: {
          level: 'critical',
          score: 4,
          indicators: ['high', 'urgent', 'asap']
        },
        metadata: {
          pattern: 'multiple_indicators',
          confidence: 0.95,
          originalMatch: '[urgency:high] URGENT: Complete ASAP'
        }
      });
    });
  });

  describe('Urgency Levels', () => {
    test('should handle all urgency levels', async () => {
      const levels = [
        { input: '[urgency:low]', level: 'low', score: 1 },
        { input: '[urgency:medium]', level: 'medium', score: 2 },
        { input: '[urgency:high]', level: 'high', score: 3 },
        { input: '[urgency:critical]', level: 'critical', score: 4 }
      ];

      for (const { input, level, score } of levels) {
        const result = await parse(input);
        expect(result.value.level).toBe(level);
        expect(result.value.score).toBe(score);
      }
    });

    test('should normalize urgency values', async () => {
      const variations = [
        { input: 'URGENT', expected: 'high' },
        { input: 'Critical', expected: 'critical' },
        { input: 'Normal', expected: 'medium' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(`[urgency:${input}]`);
        expect(result.value.level).toBe(expected);
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[urgency:high]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('URGENT: Complete report');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('needs quick attention');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for urgency at start of text', async () => {
      const result = await parse('[urgency:high] task');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[urgency:high] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should increase confidence for multiple indicators', async () => {
      const result = await parse('URGENT ASAP Critical');
      expect(result.metadata.confidence).toBeGreaterThan(0.80);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid urgency format', async () => {
      const result = await parse('[urgency:]');
      expect(result).toBeNull();
    });

    test('should handle empty urgency value', async () => {
      const result = await parse('[urgency: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[urgency:high()]',
        '[urgency:high(reason)]',
        '[urgency:high(reason=)]',
        '[urgency:high(=deadline)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid urgency levels', async () => {
      const invalidLevels = [
        '[urgency:123]',
        '[urgency:@#$]',
        '[urgency:   ]',
        '[urgency:invalid]'
      ];

      for (const level of invalidLevels) {
        const result = await parse(level);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid urgency keywords', async () => {
      const invalidKeywords = [
        'kinda urgent',
        'sort of important',
        'maybe critical'
      ];

      for (const keyword of invalidKeywords) {
        const result = await parse(keyword);
        expect(result).toBeNull();
      }
    });
  });
});
