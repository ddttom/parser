import { name, parse } from '../../src/services/parser/parsers/time.js';

describe('Time Parser', () => {
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
      expect(result.value).toEqual({
        hours: 14,
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[time:14:30]');
    });

    test('should detect time with parameters', async () => {
      const result = await parse('[time:14:30(timezone=UTC)]');
      expect(result.value).toEqual({
        hours: 14,
        minutes: 30,
        parameters: {
          timezone: 'UTC'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[time:14:30(timezone=UTC)]');
    });

    test('should parse 12-hour format', async () => {
      const times = [
        { input: '2:30pm', hours: 14, minutes: 30, match: 'Meeting at 2:30pm' },
        { input: '12:00am', hours: 0, minutes: 0, match: 'Meeting at 12:00am' },
        { input: '12:00pm', hours: 12, minutes: 0, match: 'Meeting at 12:00pm' },
        { input: '11:59pm', hours: 23, minutes: 59, match: 'Meeting at 11:59pm' }
      ];

      for (const { input, hours, minutes, match } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({ hours, minutes });
        expect(result.metadata.pattern).toBe('time');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should parse 24-hour format', async () => {
      const times = [
        { input: '14:30', hours: 14, minutes: 30, match: 'Meeting at 14:30' },
        { input: '00:00', hours: 0, minutes: 0, match: 'Meeting at 00:00' },
        { input: '12:00', hours: 12, minutes: 0, match: 'Meeting at 12:00' },
        { input: '23:59', hours: 23, minutes: 59, match: 'Meeting at 23:59' }
      ];

      for (const { input, hours, minutes, match } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({ hours, minutes });
        expect(result.metadata.pattern).toBe('time');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should handle missing minutes', async () => {
      const times = [
        { input: '2pm', hours: 14, minutes: 0, match: 'Meeting at 2pm' },
        { input: '14', hours: 14, minutes: 0, match: 'Meeting at 14' }
      ];

      for (const { input, hours, minutes, match } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({ hours, minutes });
        expect(result.metadata.pattern).toBe('time');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });
  });

  describe('Time Periods', () => {
    test('should parse morning period', async () => {
      const result = await parse('Meeting in the morning');
      expect(result.value).toEqual({
        period: 'morning',
        start: 9,
        end: 12
      });
      expect(result.metadata.pattern).toBe('period');
      expect(result.metadata.originalMatch).toBe('in the morning');
    });

    test('should parse afternoon period', async () => {
      const result = await parse('Meeting in the afternoon');
      expect(result.value).toEqual({
        period: 'afternoon',
        start: 12,
        end: 17
      });
      expect(result.metadata.pattern).toBe('period');
      expect(result.metadata.originalMatch).toBe('in the afternoon');
    });

    test('should parse evening period', async () => {
      const result = await parse('Meeting in the evening');
      expect(result.value).toEqual({
        period: 'evening',
        start: 17,
        end: 21
      });
      expect(result.metadata.pattern).toBe('period');
      expect(result.metadata.originalMatch).toBe('in the evening');
    });

    test('should handle period variations', async () => {
      const periods = [
        { input: 'early morning', match: 'Meeting in the early morning' },
        { input: 'late morning', match: 'Meeting in the late morning' },
        { input: 'early afternoon', match: 'Meeting in the early afternoon' },
        { input: 'late afternoon', match: 'Meeting in the late afternoon' },
        { input: 'early evening', match: 'Meeting in the early evening' },
        { input: 'late evening', match: 'Meeting in the late evening' }
      ];

      for (const { input, match } of periods) {
        const result = await parse(`Meeting in the ${input}`);
        expect(result.value.period).toBeDefined();
        expect(result.value.start).toBeDefined();
        expect(result.value.end).toBeDefined();
        expect(result.metadata.pattern).toBe('period');
        expect(result.metadata.originalMatch).toBe(match);
      }
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
        { input: "at 2", match: "at 2" }, // Could be 2am or 2pm
        { input: "around 2", match: "around 2" }, // Approximate time
        { input: "2-ish", match: "2-ish" }, // Informal time
        { input: "2 o'clock", match: "2 o'clock" } // Formal but ambiguous
      ];

      for (const { input, match } of ambiguous) {
        const result = await parse(input);
        if (result) {
          expect(result.metadata.pattern).toBe('ambiguous');
          expect(result.metadata.originalMatch).toBe(match);
        }
      }
    });

    test('should handle timezone indicators', async () => {
      const inputs = [
        { input: "2pm EST", match: "2pm EST" },
        { input: "14:00 UTC", match: "14:00 UTC" },
        { input: "2:30 PM GMT", match: "2:30 PM GMT" },
        { input: "2pm Pacific Time", match: "2pm Pacific Time" }
      ];

      for (const { input, match } of inputs) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.value).toEqual({
          hours: expect.any(Number),
          minutes: expect.any(Number),
          timezone: expect.any(String)
        });
        expect(result.metadata.pattern).toBe('timezone');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });
  });
});
