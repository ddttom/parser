import { name, parse } from '../../src/services/parser/parsers/timeOfDay.js';

describe('TimeOfDay Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('2:30 PM');
      expect(result.type).toBe(name);
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
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
        { input: 'morning', period: 'morning' },
        { input: 'afternoon', period: 'afternoon' },
        { input: 'evening', period: 'evening' },
        { input: 'night', period: 'night' }
      ];

      for (const { input, period } of expressions) {
        const result = await parse(`Meeting in the ${input}`);
        expect(result.value).toEqual({
          period,
          approximate: true
        });
      }
    });
  });

  describe('Time Format Handling', () => {
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

    test('should handle natural period variations', async () => {
      const variations = [
        { input: 'in the morning', period: 'morning' },
        { input: 'during the afternoon', period: 'afternoon' },
        { input: 'in evening', period: 'evening' },
        { input: 'at night', period: 'night' }
      ];

      for (const { input, period } of variations) {
        const result = await parse(input);
        expect(result.value.period).toBe(period);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time values', async () => {
      const invalidTimes = [
        '13:00 PM',  // Invalid hour for 12-hour format
        '12:60 AM',  // Invalid minutes
        '0:00 PM',   // Invalid hour for 12-hour format
        '24:00 PM'   // Invalid hour
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
        'in the daybreak',
        'in the midnight',
        'at dawn'
      ];

      for (const period of invalidPeriods) {
        const result = await parse(period);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed time formats', async () => {
      const malformed = [
        '2:PM',      // Missing minutes
        '2: PM',     // Space after colon
        '2 :30 PM',  // Space before colon
        '2.30 PM',   // Period instead of colon
        '2-30 PM'    // Hyphen instead of colon
      ];

      for (const time of malformed) {
        const result = await parse(time);
        expect(result).toBeNull();
      }
    });
  });
});
