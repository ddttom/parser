import { name, parse } from '../../src/services/parser/parsers/time.js';

describe('Time Parser', () => {
  describe('Return Format', () => {
    test('should return object with time key', async () => {
      const result = await parse('at 2:30pm');
      expect(result).toHaveProperty('time');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('at 2:30pm');
      expect(result.time).toEqual(expect.objectContaining({
        hours: expect.any(Number),
        minutes: expect.any(Number),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should parse 12-hour format', async () => {
      const times = [
        { input: '2:30pm', hours: 14, minutes: 30 },
        { input: '12:00am', hours: 0, minutes: 0 },
        { input: '12:00pm', hours: 12, minutes: 0 },
        { input: '11:59pm', hours: 23, minutes: 59 }
      ];

      for (const { input, hours, minutes } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.time).toEqual(expect.objectContaining({ hours, minutes }));
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
        expect(result.time).toEqual(expect.objectContaining({ hours, minutes }));
      }
    });

    test('should handle missing minutes', async () => {
      const times = [
        { input: '2pm', hours: 14, minutes: 0 },
        { input: '2 pm', hours: 14, minutes: 0 }
      ];

      for (const { input, hours, minutes } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.time).toEqual(expect.objectContaining({ hours, minutes }));
      }
    });
  });

  describe('Time Periods', () => {
    test('should parse morning period', async () => {
      const result = await parse('Meeting in the morning');
      expect(result.time).toEqual(expect.objectContaining({
        period: 'morning',
        start: 9,
        end: 12
      }));
    });

    test('should parse afternoon period', async () => {
      const result = await parse('Meeting in the afternoon');
      expect(result.time).toEqual(expect.objectContaining({
        period: 'afternoon',
        start: 12,
        end: 17
      }));
    });

    test('should parse evening period', async () => {
      const result = await parse('Meeting in the evening');
      expect(result.time).toEqual(expect.objectContaining({
        period: 'evening',
        start: 17,
        end: 21
      }));
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time values', async () => {
      const invalidTimes = [
        '25:00',  // Invalid hour
        '14:60',  // Invalid minute
        '-1:30',  // Negative hour
        '14:-30', // Negative minute
        'abc:30', // Non-numeric hour
        '14:def'  // Non-numeric minute
      ];

      for (const time of invalidTimes) {
        const result = await parse(`at ${time}`);
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
        expect(result.time).toEqual(expect.objectContaining({
          hours: expect.any(Number),
          minutes: expect.any(Number)
        }));
      }
    });
  });
});
