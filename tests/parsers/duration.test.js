import { name, parse } from '../../src/services/parser/parsers/duration.js';

describe('Duration Parser', () => {
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
      const result = await parse('[duration:2h30m]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[duration:2h30m]');
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
    test('should detect explicit duration markers', async () => {
      const result = await parse('Task takes [duration:2h30m]');
      expect(result).toEqual({
        type: 'duration',
        value: {
          hours: 2,
          minutes: 30,
          totalMinutes: 150
        },
        metadata: {
          pattern: 'explicit_duration',
          confidence: 0.95,
          originalMatch: '[duration:2h30m]'
        }
      });
    });

    test('should detect natural duration expressions', async () => {
      const result = await parse('Takes about 2 hours and 30 minutes');
      expect(result).toEqual({
        type: 'duration',
        value: {
          hours: 2,
          minutes: 30,
          totalMinutes: 150
        },
        metadata: {
          pattern: 'natural',
          confidence: 0.8,
          originalMatch: '2 hours and 30 minutes'
        }
      });
    });

    test('should detect short duration formats', async () => {
      const result = await parse('Duration: 2.5h');
      expect(result).toEqual({
        type: 'duration',
        value: {
          hours: 2,
          minutes: 30,
          totalMinutes: 150
        },
        metadata: {
          pattern: 'short_duration',
          confidence: 0.9,
          originalMatch: '2.5h'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[duration:2h30m]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('Duration: 2.5h');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('takes about 30 minutes');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for duration at start of text', async () => {
      const result = await parse('[duration:2h30m] for the task');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[duration:2h30m] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Duration Formats', () => {
    test('should handle hours and minutes format', async () => {
      const result = await parse('[duration:2h30m]');
      expect(result.value).toEqual({
        hours: 2,
        minutes: 30,
        totalMinutes: 150
      });
    });

    test('should handle decimal hours format', async () => {
      const result = await parse('Duration: 2.5h');
      expect(result.value).toEqual({
        hours: 2,
        minutes: 30,
        totalMinutes: 150
      });
    });

    test('should handle minutes only format', async () => {
      const result = await parse('takes 90m');
      expect(result.value).toEqual({
        hours: 1,
        minutes: 30,
        totalMinutes: 90
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid duration format', async () => {
      const result = await parse('[duration:]');
      expect(result).toBeNull();
    });

    test('should handle invalid time values', async () => {
      const result = await parse('[duration:25h]');
      expect(result).toBeNull();
    });
  });
});
