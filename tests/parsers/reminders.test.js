import { name, parse } from '../../src/services/parser/parsers/reminders.js';

describe('Reminders Parser', () => {
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
      const result = await parse('[remind:30m]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[remind:30m]');
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
    test('should detect explicit reminder markers', async () => {
      const result = await parse('[remind:30m]');
      expect(result).toEqual({
        type: 'reminder',
        value: {
          type: 'offset',
          minutes: 30
        },
        metadata: {
          pattern: 'explicit',
          confidence: 0.95,
          originalMatch: '[remind:30m]',
          isRelative: true
        }
      });
    });

    test('should detect reminder with parameters', async () => {
      const result = await parse('[remind:30m(channel=email)]');
      expect(result).toEqual({
        type: 'reminder',
        value: {
          type: 'offset',
          minutes: 30,
          parameters: {
            channel: 'email'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: 0.95,
          originalMatch: '[remind:30m(channel=email)]',
          isRelative: true
        }
      });
    });

    test('should detect time-based reminders', async () => {
      const result = await parse('remind me in 30 minutes');
      expect(result.value).toEqual({
        type: 'offset',
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('time_based');
    });

    test('should handle various time units', async () => {
      const cases = [
        ['remind me in 1 hour', 60],
        ['remind me in 2 days', 2880],
        ['remind me in 1 week', 10080]
      ];

      for (const [input, expectedMinutes] of cases) {
        const result = await parse(input);
        expect(result.value.minutes).toBe(expectedMinutes);
      }
    });

    test('should detect before-event reminders', async () => {
      const result = await parse('30 minutes before');
      expect(result.value).toEqual({
        type: 'before',
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('before');
    });

    test('should detect specific time reminders', async () => {
      const result = await parse('remind me at 2:30pm');
      expect(result.value).toEqual({
        type: 'time',
        hour: 14,
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('specific_time');
    });

    test('should detect date-based reminders', async () => {
      const result = await parse('remind me on next Monday');
      expect(result.value).toEqual({
        type: 'date',
        value: 'next Monday'
      });
      expect(result.metadata.pattern).toBe('date_based');
    });
  });

  describe('Time Format Handling', () => {
    test('should handle 12-hour format', async () => {
      const cases = [
        ['remind me at 12:00am', 0, 0],
        ['remind me at 12:00pm', 12, 0],
        ['remind me at 1:00pm', 13, 0],
        ['remind me at 11:30pm', 23, 30]
      ];

      for (const [input, expectedHour, expectedMinutes] of cases) {
        const result = await parse(input);
        expect(result.value).toEqual({
          type: 'time',
          hour: expectedHour,
          minutes: expectedMinutes
        });
      }
    });

    test('should handle missing minutes', async () => {
      const result = await parse('remind me at 3pm');
      expect(result.value).toEqual({
        type: 'time',
        hour: 15,
        minutes: 0
      });
    });

    test('should handle plural and singular units', async () => {
      const cases = [
        ['in 1 hour', 60],
        ['in 2 hours', 120],
        ['in 1 day', 1440],
        ['in 2 days', 2880]
      ];

      for (const [input, expectedMinutes] of cases) {
        const result = await parse(input);
        expect(result.value.minutes).toBe(expectedMinutes);
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[remind:30m]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('remind me in 30 minutes');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('in half an hour');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for reminder at start of text', async () => {
      const result = await parse('[remind:30m] for task');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[remind:30m] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid reminder format', async () => {
      const result = await parse('[remind:]');
      expect(result).toBeNull();
    });

    test('should handle empty reminder value', async () => {
      const result = await parse('[remind: ]');
      expect(result).toBeNull();
    });

    test('should handle invalid time values', async () => {
      const invalidTimes = [
        'remind me at 25:00',
        'remind me at -1:30',
        'remind me at 12:60'
      ];

      for (const time of invalidTimes) {
        const result = await parse(time);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[remind:30m()]',
        '[remind:30m(channel)]',
        '[remind:30m(channel=)]',
        '[remind:30m(=email)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid time units', async () => {
      const invalidUnits = [
        'remind me in 0 minutes',
        'remind me in -1 hours',
        'remind me in 1.5 days'
      ];

      for (const unit of invalidUnits) {
        const result = await parse(unit);
        expect(result).toBeNull();
      }
    });
  });
});
