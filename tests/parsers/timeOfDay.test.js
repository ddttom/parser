import { name, parse } from '../../src/services/parser/parsers/timeOfDay.js';

describe('TimeOfDay Parser', () => {
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
      expect(result.value).toEqual({
        hour: 14,
        minute: 30,
        format: '24h'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[timeofday:14:30]');
    });

    test('should detect time with parameters', async () => {
      const result = await parse('[timeofday:14:30(timezone=UTC)]');
      expect(result.value).toEqual({
        hour: 14,
        minute: 30,
        format: '24h',
        parameters: {
          timezone: 'UTC'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[timeofday:14:30(timezone=UTC)]');
    });

    test('should detect 12-hour format times', async () => {
      const times = [
        { input: '2:30 PM', hour: 14, minute: 30, period: 'PM', match: 'Meeting at 2:30 PM' },
        { input: '12:00 AM', hour: 0, minute: 0, period: 'AM', match: 'Meeting at 12:00 AM' },
        { input: '12:00 PM', hour: 12, minute: 0, period: 'PM', match: 'Meeting at 12:00 PM' },
        { input: '11:59 PM', hour: 23, minute: 59, period: 'PM', match: 'Meeting at 11:59 PM' }
      ];

      for (const { input, hour, minute, period, match } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual({
          hour,
          minute,
          format: '12h',
          period
        });
        expect(result.metadata.pattern).toBe('time');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should detect natural time expressions', async () => {
      const expressions = [
        { input: 'morning', period: 'morning', start: 6, end: 12, match: 'Meeting in the morning' },
        { input: 'afternoon', period: 'afternoon', start: 12, end: 17, match: 'Meeting in the afternoon' },
        { input: 'evening', period: 'evening', start: 17, end: 22, match: 'Meeting in the evening' },
        { input: 'night', period: 'night', start: 22, end: 6, match: 'Meeting in the night' }
      ];

      for (const { input, period, start, end, match } of expressions) {
        const result = await parse(`Meeting in the ${input}`);
        expect(result.value).toEqual({
          period,
          approximate: true,
          start,
          end
        });
        expect(result.metadata.pattern).toBe('natural');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });
  });

  describe('Time Format Handling', () => {
    test('should handle missing minutes', async () => {
      const times = [
        { input: '2 PM', hour: 14, minute: 0, match: 'Meeting at 2 PM' },
        { input: '14', hour: 14, minute: 0, match: 'Meeting at 14' }
      ];

      for (const { input, hour, minute, match } of times) {
        const result = await parse(`Meeting at ${input}`);
        expect(result.value).toEqual(expect.objectContaining({ hour, minute }));
        expect(result.metadata.pattern).toBe('time');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should handle period variations', async () => {
      const variations = [
        { input: 'PM', normalized: 'PM', match: 'Meeting at 2:30 PM' },
        { input: 'pm', normalized: 'PM', match: 'Meeting at 2:30 pm' },
        { input: 'p.m.', normalized: 'PM', match: 'Meeting at 2:30 p.m.' },
        { input: 'P.M.', normalized: 'PM', match: 'Meeting at 2:30 P.M.' }
      ];

      for (const { input, normalized, match } of variations) {
        const result = await parse(`Meeting at 2:30 ${input}`);
        expect(result.value.period).toBe(normalized);
        expect(result.metadata.pattern).toBe('time');
        expect(result.metadata.originalMatch).toBe(match);
      }
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
