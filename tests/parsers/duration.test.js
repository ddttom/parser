import { name, parse } from '../../src/services/parser/parsers/duration.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.MEDIUM,
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
          confidence: Confidence.HIGH,
          originalMatch: '2.5h'
        }
      });
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit duration markers', async () => {
      const result = await parse('[duration:2h30m]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for short duration formats', async () => {
      const result = await parse('Duration: 2.5h');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for minutes only format', async () => {
      const result = await parse('takes 90m');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for natural duration expressions', async () => {
      const result = await parse('takes about 30 minutes');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[duration:2h30m]');
      const result2 = await parse('[duration:1h45m]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
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
