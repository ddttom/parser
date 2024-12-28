import { name, parse } from '../../src/services/parser/parsers/reminders.js';

describe('Reminders Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[remind:30m]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[remind:30m]');
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
    test('should detect explicit reminder markers', async () => {
      const result = await parse('[remind:30m]');
      expect(result.value).toEqual({
        type: 'offset',
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[remind:30m]');
      expect(result.metadata.isRelative).toBe(true);
    });

    test('should detect reminder with parameters', async () => {
      const result = await parse('[remind:30m(channel=email)]');
      expect(result.value).toEqual({
        type: 'offset',
        minutes: 30,
        parameters: {
          channel: 'email'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[remind:30m(channel=email)]');
      expect(result.metadata.isRelative).toBe(true);
    });

    test('should detect time-based reminders', async () => {
      const result = await parse('remind me in 30 minutes');
      expect(result.value).toEqual({
        type: 'offset',
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('time_based');
      expect(result.metadata.originalMatch).toBe('remind me in 30 minutes');
    });

    test('should handle various time units', async () => {
      const cases = [
        ['remind me in 1 hour', 60, 'remind me in 1 hour'],
        ['remind me in 2 days', 2880, 'remind me in 2 days'],
        ['remind me in 1 week', 10080, 'remind me in 1 week']
      ];

      for (const [input, expectedMinutes, expectedMatch] of cases) {
        const result = await parse(input);
        expect(result.value.minutes).toBe(expectedMinutes);
        expect(result.metadata.pattern).toBe('time_based');
        expect(result.metadata.originalMatch).toBe(expectedMatch);
      }
    });

    test('should detect before-event reminders', async () => {
      const result = await parse('30 minutes before');
      expect(result.value).toEqual({
        type: 'before',
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('before');
      expect(result.metadata.originalMatch).toBe('30 minutes before');
    });

    test('should detect specific time reminders', async () => {
      const result = await parse('remind me at 2:30pm');
      expect(result.value).toEqual({
        type: 'time',
        hour: 14,
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('specific_time');
      expect(result.metadata.originalMatch).toBe('remind me at 2:30pm');
    });

    test('should detect date-based reminders', async () => {
      const result = await parse('remind me on next Monday');
      expect(result.value).toEqual({
        type: 'date',
        value: 'next Monday'
      });
      expect(result.metadata.pattern).toBe('date_based');
      expect(result.metadata.originalMatch).toBe('remind me on next Monday');
    });
  });

  describe('Time Format Handling', () => {
    test('should handle 12-hour format', async () => {
      const cases = [
        ['remind me at 12:00am', 0, 0, 'remind me at 12:00am'],
        ['remind me at 12:00pm', 12, 0, 'remind me at 12:00pm'],
        ['remind me at 1:00pm', 13, 0, 'remind me at 1:00pm'],
        ['remind me at 11:30pm', 23, 30, 'remind me at 11:30pm']
      ];

      for (const [input, expectedHour, expectedMinutes, expectedMatch] of cases) {
        const result = await parse(input);
        expect(result.value).toEqual({
          type: 'time',
          hour: expectedHour,
          minutes: expectedMinutes
        });
        expect(result.metadata.pattern).toBe('specific_time');
        expect(result.metadata.originalMatch).toBe(expectedMatch);
      }
    });

    test('should handle missing minutes', async () => {
      const result = await parse('remind me at 3pm');
      expect(result.value).toEqual({
        type: 'time',
        hour: 15,
        minutes: 0
      });
      expect(result.metadata.pattern).toBe('specific_time');
      expect(result.metadata.originalMatch).toBe('remind me at 3pm');
    });

    test('should handle plural and singular units', async () => {
      const cases = [
        ['in 1 hour', 60, 'in 1 hour'],
        ['in 2 hours', 120, 'in 2 hours'],
        ['in 1 day', 1440, 'in 1 day'],
        ['in 2 days', 2880, 'in 2 days']
      ];

      for (const [input, expectedMinutes, expectedMatch] of cases) {
        const result = await parse(input);
        expect(result.value.minutes).toBe(expectedMinutes);
        expect(result.metadata.pattern).toBe('time_based');
        expect(result.metadata.originalMatch).toBe(expectedMatch);
      }
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
