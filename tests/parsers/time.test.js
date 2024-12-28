import { name, parse } from '../../src/services/parser/parsers/time.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Time Parser', () => {
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
      const result = await parse('[time:14:30]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[time:14:30]');
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
      const result = await parse('[time:14:30]');
      expect(result).toEqual({
        type: 'time',
        value: {
          hours: 14,
          minutes: 30
        },
        metadata: {
          pattern: 'explicit',
          confidence: Confidence.HIGH,
          originalMatch: '[time:14:30]'
        }
      });
    });

    test('should detect time with parameters', async () => {
      const result = await parse('[time:14:30(timezone=UTC)]');
      expect(result).toEqual({
        type: 'time',
        value: {
          hours: 14,
          minutes: 30,
          parameters: {
            timezone: 'UTC'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: Confidence.HIGH,
          originalMatch: '[time:14:30(timezone=UTC)]'
        }
      });
    });

    test('should parse 12-hour format', async () => {
      const times = [
        { input: '2:30pm', hours: 14, minutes: 30 },
        { input: '12:00am', hours: 0, minutes: 0 },
        { input: '12:00pm', hours: 12, minutes: 0 },
        { input: '11:59pm', hours: 23, minutes: 59 }
      ];

      for (const { input, hours, minutes } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({ hours, minutes });
      }
    });

    test('should parse 24-hour format', async () => {
      const times = [
        { input: '14:30', hours: 14, minutes: 30 },
        { input: '00:00', hours: 0, minutes: 0 },
        { input: '12:00', hours: 12, minutes: 0 },
        { input: '23:59', hours: 23, minutes: 59 }
      ];

      for (const { input, hours, minutes } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({ hours, minutes });
      }
    });

    test('should handle missing minutes', async () => {
      const times = [
        { input: '2pm', hours: 14, minutes: 0 },
        { input: '14', hours: 14, minutes: 0 }
      ];

      for (const { input, hours, minutes } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({ hours, minutes });
      }
    });
  });

  describe('Time Periods', () => {
    test('should parse morning period', async () => {
      const result = await parse('Meeting in the morning');
      expect(result).toEqual({
        type: 'time',
        value: {
          period: 'morning',
          start: 9,
          end: 12
        },
        metadata: {
          pattern: 'period',
          confidence: Confidence.MEDIUM,
          originalMatch: 'in the morning'
        }
      });
    });

    test('should parse afternoon period', async () => {
      const result = await parse('Meeting in the afternoon');
      expect(result.value).toEqual({
        period: 'afternoon',
        start: 12,
        end: 17
      });
    });

    test('should parse evening period', async () => {
      const result = await parse('Meeting in the evening');
      expect(result.value).toEqual({
        period: 'evening',
        start: 17,
        end: 21
      });
    });

    test('should handle period variations', async () => {
      const periods = [
        'early morning',
        'late morning',
        'early afternoon',
        'late afternoon',
        'early evening',
        'late evening'
      ];

      for (const period of periods) {
        const result = await parse(`Meeting in the ${period}`);
        expect(result.value.period).toBeDefined();
        expect(result.value.start).toBeDefined();
        expect(result.value.end).toBeDefined();
      }
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[time:14:30]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for 24-hour format', async () => {
      const result = await parse('Meeting at 14:30');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for specific 12-hour format', async () => {
      const result = await parse('Meeting at 2:30pm');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for period patterns', async () => {
      const result = await parse('Meeting in the morning');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have LOW confidence for action patterns', async () => {
      const result = await parse('meet at 2');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[time:14:30]');
      const result2 = await parse('[time:15:45]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time format', async () => {
      const result = await parse('[time:]');
      expect(result).toBeNull();
    });

    test('should handle empty time value', async () => {
      const result = await parse('[time: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[time:14:30()]',
        '[time:14:30(timezone)]',
        '[time:14:30(timezone=)]',
        '[time:14:30(=UTC)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid time values', async () => {
      const invalidTimes = [
        '[time:25:00]',  // Invalid hour
        '[time:14:60]',  // Invalid minute
        '[time:-1:30]',  // Negative hour
        '[time:14:-30]', // Negative minute
        '[time:abc:30]', // Non-numeric hour
        '[time:14:def]'  // Non-numeric minute
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

  describe('Edge Cases', () => {
    test('should not match numbers in date contexts', async () => {
      const inputs = [
        "in 2 weeks",
        "2 days from now",
        "2 months",
        "2nd of March"
      ];

      for (const input of inputs) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should match valid time formats', async () => {
      const inputs = [
        "2pm",
        "2:00pm",
        "14:00",
        "2:30 PM"
      ];

      for (const input of inputs) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.type).toBe('time');
        expect(result.value).toEqual({
          hours: expect.any(Number),
          minutes: expect.any(Number)
        });
      }
    });

    test('should handle ambiguous time references', async () => {
      const ambiguous = [
        "at 2", // Could be 2am or 2pm
        "around 2", // Approximate time
        "2-ish", // Informal time
        "2 o'clock" // Formal but ambiguous
      ];

      for (const input of ambiguous) {
        const result = await parse(input);
        if (result) {
          expect(result.metadata.confidence).toBe(Confidence.LOW);
        }
      }
    });

    test('should handle timezone indicators', async () => {
      const inputs = [
        "2pm EST",
        "14:00 UTC",
        "2:30 PM GMT",
        "2pm Pacific Time"
      ];

      for (const input of inputs) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.value).toEqual({
          hours: expect.any(Number),
          minutes: expect.any(Number),
          timezone: expect.any(String)
        });
      }
    });
  });
});
