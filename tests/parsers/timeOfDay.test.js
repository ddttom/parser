import { name, parse } from '../../src/services/parser/parsers/timeOfDay.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('TimeOfDay Parser', () => {
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
      const result = await parse('[timeofday:14:30]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[timeofday:14:30]');
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
    test('should detect explicit time markers', async () => {
      const result = await parse('[timeofday:14:30]');
      expect(result).toEqual({
        type: 'timeofday',
        value: {
          hour: 14,
          minute: 30,
          format: '24h'
        },
        metadata: {
          pattern: 'explicit',
          confidence: Confidence.HIGH,
          originalMatch: '[timeofday:14:30]'
        }
      });
    });

    test('should detect time with parameters', async () => {
      const result = await parse('[timeofday:14:30(timezone=UTC)]');
      expect(result).toEqual({
        type: 'timeofday',
        value: {
          hour: 14,
          minute: 30,
          format: '24h',
          parameters: {
            timezone: 'UTC'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: Confidence.HIGH,
          originalMatch: '[timeofday:14:30(timezone=UTC)]'
        }
      });
    });

    test('should detect 12-hour format times', async () => {
      const times = [
        { input: '2:30 PM', hour: 14, minute: 30, period: 'PM' },
        { input: '12:00 AM', hour: 0, minute: 0, period: 'AM' },
        { input: '12:00 PM', hour: 12, minute: 0, period: 'PM' },
        { input: '11:59 PM', hour: 23, minute: 59, period: 'PM' }
      ];

      for (const { input, hour, minute, period } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({
          hour,
          minute,
          format: '12h',
          period
        });
      }
    });

    test('should detect natural time expressions', async () => {
      const expressions = [
        { input: 'morning', period: 'morning', start: 6, end: 12 },
        { input: 'afternoon', period: 'afternoon', start: 12, end: 17 },
        { input: 'evening', period: 'evening', start: 17, end: 22 },
        { input: 'night', period: 'night', start: 22, end: 6 }
      ];

      for (const { input, period, start, end } of expressions) {
        const result = await parse(`Meeting in the ${input}`);
        expect(result.value).toEqual({
          period,
          approximate: true,
          start,
          end
        });
      }
    });
  });

  describe('Time Format Handling', () => {
    test('should handle missing minutes', async () => {
      const times = [
        { input: '2 PM', hour: 14, minute: 0 },
        { input: '14', hour: 14, minute: 0 }
      ];

      for (const { input, hour, minute } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual(expect.objectContaining({ hour, minute }));
      }
    });

    test('should handle period variations', async () => {
      const variations = [
        { input: 'PM', normalized: 'PM' },
        { input: 'pm', normalized: 'PM' },
        { input: 'p.m.', normalized: 'PM' },
        { input: 'P.M.', normalized: 'PM' }
      ];

      for (const { input, normalized } of variations) {
        const result = await parse(`Meeting at 2:30 ${input}`);
        expect(result.value.period).toBe(normalized);
      }
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[timeofday:14:30]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for 12-hour format', async () => {
      const result = await parse('Meeting at 2:30 PM');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for natural time expressions', async () => {
      const result = await parse('Meeting in the morning');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[timeofday:14:30]');
      const result2 = await parse('[timeofday:15:45]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time format', async () => {
      const result = await parse('[timeofday:]');
      expect(result).toBeNull();
    });

    test('should handle empty time value', async () => {
      const result = await parse('[timeofday: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[timeofday:14:30()]',
        '[timeofday:14:30(timezone)]',
        '[timeofday:14:30(timezone=)]',
        '[timeofday:14:30(=UTC)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid time values', async () => {
      const invalidTimes = [
        '[timeofday:25:00]',  // Invalid hour
        '[timeofday:14:60]',  // Invalid minute
        '[timeofday:-1:30]',  // Negative hour
        '[timeofday:14:-30]', // Negative minute
        '[timeofday:abc:30]', // Non-numeric hour
        '[timeofday:14:def]'  // Non-numeric minute
      ];

      for (const time of invalidTimes) {
        const result = await parse(time);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid period names', async () => {
      const invalidPeriods = [
        'in the middlenight',
        'in the noontime',
        'in the daybreak'
      ];

      for (const period of invalidPeriods) {
        const result = await parse(period);
        expect(result).toBeNull();
      }
    });
  });
});
