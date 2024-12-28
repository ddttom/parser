import { name, parse } from '../../src/services/parser/parsers/reminders.js';

describe('Reminders Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('remind me in 30 minutes');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('remind me in 30 minutes');
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
    test('should detect relative time reminders', async () => {
      const result = await parse('in 30 minutes');
      expect(result.value).toEqual({
        type: 'offset',
        minutes: 30
      });
      expect(result.metadata.pattern).toBe('relative');
      expect(result.metadata.originalMatch).toBe('in 30 minutes');
      expect(result.metadata.isRelative).toBe(true);
    });

    test('should handle various time units', async () => {
      const cases = [
        { input: 'in 1 hour', minutes: 60 },
        { input: 'in 2 days', minutes: 2880 },
        { input: 'in 1 week', minutes: 10080 }
      ];

      for (const { input, minutes } of cases) {
        const result = await parse(input);
        expect(result.value).toEqual({
          type: 'offset',
          minutes
        });
        expect(result.metadata.pattern).toBe('relative');
        expect(result.metadata.originalMatch).toBe(input);
      }
    });

    test('should detect before-event reminders', async () => {
      const variations = [
        '30 minutes before',
        '1 hour before',
        '2 days before',
        '1 week before'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.type).toBe('before');
        expect(result.metadata.pattern).toBe('before');
        expect(result.metadata.originalMatch).toBe(input);
      }
    });

    test('should detect specific time reminders', async () => {
      const variations = [
        { input: 'remind me at 2:30pm', hour: 14, minutes: 30 },
        { input: 'remind me at 9:00am', hour: 9, minutes: 0 },
        { input: 'remind me at 12:00pm', hour: 12, minutes: 0 },
        { input: 'remind me at 12:00am', hour: 0, minutes: 0 }
      ];

      for (const { input, hour, minutes } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          type: 'time',
          hour,
          minutes
        });
        expect(result.metadata.pattern).toBe('at');
      }
    });

    test('should detect date-based reminders', async () => {
      const variations = [
        'remind me on Monday',
        'remind me on next Friday',
        'remind me on December 25',
        'remind me on next week'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.type).toBe('date');
        expect(result.metadata.pattern).toBe('on');
      }
    });

    test('should detect time word reminders', async () => {
      const variations = [
        { input: 'remind me tomorrow', minutes: 1440 },
        { input: 'remind me next week', minutes: 10080 },
        { input: 'remind me next month', minutes: 43200 }
      ];

      for (const { input, minutes } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          type: 'offset',
          minutes
        });
        expect(result.metadata.pattern).toBe('timeword');
      }
    });
  });

  describe('Time Format Handling', () => {
    test('should handle 12-hour format', async () => {
      const cases = [
        { input: 'remind me at 12:00am', hour: 0, minutes: 0 },
        { input: 'remind me at 12:00pm', hour: 12, minutes: 0 },
        { input: 'remind me at 1:00pm', hour: 13, minutes: 0 },
        { input: 'remind me at 11:30pm', hour: 23, minutes: 30 }
      ];

      for (const { input, hour, minutes } of cases) {
        const result = await parse(input);
        expect(result.value).toEqual({
          type: 'time',
          hour,
          minutes
        });
        expect(result.metadata.pattern).toBe('at');
      }
    });

    test('should handle missing minutes', async () => {
      const result = await parse('remind me at 3pm');
      expect(result.value).toEqual({
        type: 'time',
        hour: 15,
        minutes: 0
      });
      expect(result.metadata.pattern).toBe('at');
    });

    test('should handle plural and singular units', async () => {
      const cases = [
        { input: 'in 1 hour', minutes: 60 },
        { input: 'in 2 hours', minutes: 120 },
        { input: 'in 1 day', minutes: 1440 },
        { input: 'in 2 days', minutes: 2880 }
      ];

      for (const { input, minutes } of cases) {
        const result = await parse(input);
        expect(result.value.minutes).toBe(minutes);
        expect(result.metadata.pattern).toBe('relative');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time values', async () => {
      const invalidTimes = [
        'remind me at 25:00',
        'remind me at -1:30',
        'remind me at 12:60'
      ];

      for (const input of invalidTimes) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid time units', async () => {
      const invalidUnits = [
        'in 0 minutes',
        'in -1 hours',
        'in 1.5 days'
      ];

      for (const input of invalidUnits) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed patterns', async () => {
      const malformed = [
        'remind at',
        'remind in',
        'remind on',
        'in minutes',
        'at time'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
